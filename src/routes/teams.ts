import { Router } from "express";
import type { Store } from "../db.js";

export function teamsRouter(store: Store): Router {
  const router = Router();

  router.get("/teams/me/members", (_req, res) => {
    const members = store.listMembers(res.locals.auth.teamId).map((m) => ({
      user_id: m.userId,
      email: m.email,
      role: m.role,
      status: m.status,
      removed_at: m.removedAt,
    }));
    res.json({ members });
  });

  router.delete("/teams/me/members/:userId", (req, res) => {
    const { teamId, userId } = res.locals.auth;
    const actor = store.findMember(teamId, userId);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      res.status(403).json({ message: "Only team owners and admins can remove members" });
      return;
    }
    const target = store.findMember(teamId, req.params.userId);
    if (!target || target.status === "removed") {
      res.status(404).json({ message: "Member not found" });
      return;
    }
    if (target.role === "owner") {
      res.status(400).json({ message: "The team owner cannot be removed" });
      return;
    }
    store.removeMember(teamId, target.userId);
    res.status(204).end();
  });

  return router;
}
