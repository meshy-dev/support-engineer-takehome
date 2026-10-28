import { randomBytes } from "node:crypto";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { requireApiKey } from "./auth.js";
import type { Store } from "./db.js";
import { rateLimit } from "./rateLimit.js";
import { remeshRouter } from "./routes/remesh.js";
import { tasksRouter } from "./routes/tasks.js";
import { teamsRouter } from "./routes/teams.js";

export type AppOptions = {
  // How long a task takes to reach SUCCEEDED.
  taskDurationMs?: number;
  rateLimitPerSecond?: number;
  // Print one JSON line per request to stdout.
  log?: boolean;
};

// Same line format as the production request log (see logs/).
function requestLog(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    const started = Date.now();
    const requestId = `req_${randomBytes(6).toString("hex")}`;
    res.set("X-Request-Id", requestId);
    res.on("finish", () => {
      if (!enabled) return;
      const auth = res.locals.auth;
      const line = {
        ts: new Date(started).toISOString(),
        request_id: requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        latency_ms: Date.now() - started,
        key_prefix: auth?.apiKey.slice(0, 11),
        team: auth?.teamId,
        user: auth?.userId,
        task_id: res.locals.taskId,
        task_status: res.locals.taskStatus,
        error: res.locals.error,
      };
      console.log(JSON.stringify(line));
    });
    next();
  };
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.status === "number" ? err.status : 500;
  res.locals.error = err.message;
  res.status(status).json({ message: err.message });
};

export function createApp(store: Store, options: AppOptions = {}) {
  const durationMs = options.taskDurationMs ?? 15_000;
  const app = express();
  app.use(requestLog(options.log ?? true));
  app.use(express.json());
  app.use("/v1", requireApiKey(store), rateLimit(options.rateLimitPerSecond ?? 5));
  app.use("/v1", tasksRouter(store, durationMs));
  app.use("/v1", remeshRouter(store, durationMs));
  app.use("/v1", teamsRouter(store));
  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });
  app.use(errorHandler);
  return app;
}
