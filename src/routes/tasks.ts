import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { Store, Task } from "../db.js";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED";

export function newTaskId(): string {
  return `tsk_${randomBytes(6).toString("hex")}`;
}

// Tasks have no worker in this mock: status is derived from how long ago the task was created.
export function taskView(task: Task, durationMs: number) {
  const elapsed = Date.now() - Date.parse(task.createdAt);
  const fraction = durationMs > 0 ? Math.min(elapsed / durationMs, 1) : 1;
  const status: TaskStatus = fraction >= 1 ? "SUCCEEDED" : fraction < 0.1 ? "PENDING" : "IN_PROGRESS";
  return {
    id: task.id,
    type: task.type,
    status,
    progress: Math.floor(fraction * 100),
    created_at: task.createdAt,
    input: task.input,
    model_urls: status === "SUCCEEDED" ? { glb: `https://assets.example.com/${task.id}/model.glb` } : undefined,
  };
}

export function tasksRouter(store: Store, durationMs: number): Router {
  const router = Router();

  router.post("/text-to-3d", (req, res) => {
    const { prompt } = req.body ?? {};
    if (typeof prompt !== "string" || prompt.trim() === "") {
      res.status(400).json({ message: "prompt is required" });
      return;
    }
    if (prompt.length > 600) {
      res.status(400).json({ message: "prompt must be at most 600 characters" });
      return;
    }
    const { teamId, userId } = res.locals.auth;
    const task: Task = {
      id: newTaskId(),
      teamId,
      createdBy: userId,
      type: "text-to-3d",
      input: { prompt },
      createdAt: new Date().toISOString(),
    };
    store.insertTask(task);
    res.locals.taskId = task.id;
    res.status(202).json({ result: task.id });
  });

  router.get("/text-to-3d/:id", (req, res) => {
    const task = store.getTask(req.params.id);
    if (!task || task.teamId !== res.locals.auth.teamId || task.type !== "text-to-3d") {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    const view = taskView(task, durationMs);
    res.locals.taskId = task.id;
    res.locals.taskStatus = view.status;
    res.json(view);
  });

  return router;
}
