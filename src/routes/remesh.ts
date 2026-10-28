import { Router } from "express";
import type { Store, Task } from "../db.js";
import { newTaskId, taskView } from "./tasks.js";

const TOPOLOGIES = ["quad", "triangle"];

export function remeshRouter(store: Store, durationMs: number): Router {
  const router = Router();

  router.post("/remesh", (req, res) => {
    const { input_task_id, target_polycount, topology = "triangle" } = req.body ?? {};
    if (typeof input_task_id !== "string" || input_task_id === "") {
      res.status(400).json({ message: "input_task_id is required" });
      return;
    }
    if (!TOPOLOGIES.includes(topology)) {
      res.status(400).json({ message: 'topology must be "quad" or "triangle"' });
      return;
    }
    const { teamId, userId } = res.locals.auth;
    const source = store.getTask(input_task_id);
    if (!source || source.teamId !== teamId) {
      res.status(404).json({ message: "Input task not found" });
      return;
    }
    if (taskView(source, durationMs).status !== "SUCCEEDED") {
      res.status(400).json({ message: "Input task has not finished yet" });
      return;
    }
    const task: Task = {
      id: newTaskId(),
      teamId,
      createdBy: userId,
      type: "remesh",
      input: { input_task_id, target_polycount, topology },
      createdAt: new Date().toISOString(),
    };
    store.insertTask(task);
    res.locals.taskId = task.id;
    res.status(202).json({ result: task.id });
  });

  router.get("/remesh/:id", (req, res) => {
    const task = store.getTask(req.params.id);
    if (!task || task.teamId !== res.locals.auth.teamId || task.type !== "remesh") {
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
