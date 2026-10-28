import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadSeed } from "../src/db.js";

const DANA = "Bearer msy_nw_d4n8Qe71VbKx3LpR0sTz"; // Northwind owner
const LEE = "Bearer msy_nw_l33kWm52HcJ8yNf6aGd"; // Northwind member
const ARI = "Bearer msy_lm_4r1sPd93TgVb6Hn2QwE"; // Lumen owner

function newApp() {
  return createApp(loadSeed(), { taskDurationMs: 50, log: false });
}

describe("auth", () => {
  it("rejects a missing key", async () => {
    const res = await request(newApp()).get("/v1/teams/me/members");
    expect(res.status).toBe(401);
  });

  it("rejects an unknown key", async () => {
    const res = await request(newApp()).get("/v1/teams/me/members").set("Authorization", "Bearer msy_nope");
    expect(res.status).toBe(401);
  });
});

describe("text-to-3d", () => {
  it("creates a task and reports its status", async () => {
    const app = newApp();
    const created = await request(app).post("/v1/text-to-3d").set("Authorization", DANA).send({ prompt: "a wooden chair" });
    expect(created.status).toBe(202);

    const task = await request(app).get(`/v1/text-to-3d/${created.body.result}`).set("Authorization", DANA);
    expect(task.status).toBe(200);
    expect(["PENDING", "IN_PROGRESS", "SUCCEEDED"]).toContain(task.body.status);
  });

  it("requires a prompt", async () => {
    const res = await request(newApp()).post("/v1/text-to-3d").set("Authorization", DANA).send({});
    expect(res.status).toBe(400);
  });

  it("hides other teams' tasks", async () => {
    const res = await request(newApp()).get("/v1/text-to-3d/tsk_nw_tower01").set("Authorization", ARI);
    expect(res.status).toBe(404);
  });
});

describe("remesh", () => {
  it("remeshes a finished task", async () => {
    const res = await request(newApp())
      .post("/v1/remesh")
      .set("Authorization", ARI)
      .send({ input_task_id: "tsk_lm_chair01", target_polycount: 30000 });
    expect(res.status).toBe(202);
  });

  it("rejects an unknown topology", async () => {
    const res = await request(newApp())
      .post("/v1/remesh")
      .set("Authorization", ARI)
      .send({ input_task_id: "tsk_lm_chair01", topology: "hex" });
    expect(res.status).toBe(400);
  });
});

describe("teams", () => {
  it("lets the owner remove a member", async () => {
    const app = newApp();
    const res = await request(app).delete("/v1/teams/me/members/u_lee").set("Authorization", DANA);
    expect(res.status).toBe(204);

    const list = await request(app).get("/v1/teams/me/members").set("Authorization", DANA);
    const lee = list.body.members.find((m: { user_id: string }) => m.user_id === "u_lee");
    expect(lee.status).toBe("removed");
  });

  it("does not let a regular member remove anyone", async () => {
    const res = await request(newApp()).delete("/v1/teams/me/members/u_dana").set("Authorization", LEE);
    expect(res.status).toBe(403);
  });
});

describe("rate limit", () => {
  it("returns 429 after 5 requests in one second", async () => {
    const app = newApp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app).get("/v1/text-to-3d/tsk_nw_tower01").set("Authorization", DANA);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });
});
