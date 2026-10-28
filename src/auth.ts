import type { RequestHandler } from "express";
import type { Store } from "./db.js";

// Resolves the Bearer API key to a team and the user who created the key.
export function requireApiKey(store: Store): RequestHandler {
  return (req, res, next) => {
    const header = req.get("authorization") ?? "";
    const key = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    const apiKey = store.findApiKey(key);
    if (!apiKey || apiKey.revokedAt) {
      res.status(401).json({ message: "Invalid or missing API key" });
      return;
    }
    res.locals.auth = { apiKey: apiKey.key, teamId: apiKey.teamId, userId: apiKey.createdBy };
    next();
  };
}
