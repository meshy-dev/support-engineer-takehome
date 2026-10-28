# Meshy Support Engineer take-home

Thanks for taking the time to do this.

At Meshy, support engineers sit between our API customers and the engineering team. When something breaks, they work out why, fix what they can, and explain it clearly to the customer. This exercise is a small version of one support shift.

This repo is a small mock of an API like ours: customers create 3D generation tasks with an API key, then poll each task until it finishes. It is a simplified stand-in, not our real code, and every customer, key, and log line in it is made up.

Three customer tickets are waiting in [`tickets/`](tickets/). For each one, work out what is going on, fix it if it needs fixing, and write the reply you would send the customer. You can change code and open a pull request, but you can't deploy: engineering reviews and ships your fix. All times are UTC.

- **Time:** about 2 hours. Please don't spend more than 3. Partial answers are fine; tell us what you would do next.
- **AI tools:** use whatever you normally use (Claude Code, Cursor, Codex, ChatGPT, anything). We expect it. What we care about is that you understand and check what it gives you.
- **Questions:** reply to the email you got this from.

## Getting started

1. On this repo's GitHub page, click **Use this template** → **Create a new repository**.
2. Owner: your personal account. Visibility: **Private**. Name it anything.
3. Clone your new repo and create a branch: `git checkout -b solution`
4. Install and run (Node 22.12 or newer):

   ```bash
   npm ci
   npm run dev        # mock API on http://localhost:3000, restarts when you edit code
   npm test
   npm run typecheck
   ```

   Port 3000 busy? Use `PORT=3001 npm run dev`. The local API enforces the same rate limit as production (5 requests per second per key), so a quick loop of curl calls will get some 429s.

5. Try a request:

   ```bash
   curl -s -X POST http://localhost:3000/v1/text-to-3d \
     -H "Authorization: Bearer msy_lm_4r1sPd93TgVb6Hn2QwE" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "a wooden chair"}'
   ```

   Test API keys for every customer are in [`data/seed.json`](data/seed.json). Locally, tasks finish 15 seconds after they are created.

## Submitting

1. **Add `BoogieJie` as a collaborator** on your repo (**Settings → Collaborators → Add people**). Your repo is private, so without this we can't see your pull request.
2. Fill in [`ANSWERS.md`](ANSWERS.md). If you used an agent instructions file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, ...), commit it too.
3. Push your branch and open a pull request from `solution` into `main` **in your own repo**.
4. Reply to the email with the link to your pull request within 7 days.

## What we look at

- Finding the real cause, backed by evidence from the code or the logs.
- Fixes that are small, correct, and tested. "No code change needed, and here's why" is a valid answer; add tests only for code you change.
- Replies a customer would be glad to get: clear, honest, and specific.
- Judgment: what is urgent, what isn't a bug at all, and anything you noticed beyond the tickets.

We are not looking for refactors, new features, or polish beyond the tickets. Don't worry about `npm audit` output or other dependency housekeeping.

## Project layout

| Path | What it is |
|---|---|
| `src/app.ts` | Express app: request logging, auth, rate limit, routes, error handler |
| `src/auth.ts` | API key authentication |
| `src/rateLimit.ts` | Per-key rate limit |
| `src/routes/` | `tasks.ts` (text-to-3d), `remesh.ts`, `teams.ts` (team members) |
| `src/db.ts` | In-memory stand-in for the production database |
| `data/seed.json` | Teams, members, API keys, and a few finished tasks |
| `tests/` | Vitest + Supertest |
| `logs/requests.jsonl` | Production request log for 2026-10-18 to 2026-10-20 (UTC) |
| `tickets/` | The three customer tickets |

### Request log format

One JSON object per line, one line per request. The local server prints the same format to stdout. Request bodies (including prompts) are not logged.

| Field | Meaning |
|---|---|
| `ts` | When the request arrived (UTC) |
| `request_id` | Also returned to the caller in the `X-Request-Id` header |
| `method`, `path`, `status`, `latency_ms` | The request and how we answered it |
| `key_prefix` | First 11 characters of the API key used |
| `team`, `user` | The team the key belongs to, and the user who created the key. This is the key's owner, not necessarily the person who sent the request. |
| `task_id` | Task created (POST) or read (GET). Empty on requests rejected before they reach the route (401, 429); use `path` for those. |
| `task_status` | Task status returned by a GET |
| `error` | Internal error message, only on 5xx |

`jq` is handy here, for example: `jq -c 'select(.status >= 500)' logs/requests.jsonl`

## API reference

This is what customers see in our public docs.

**Authentication.** Send `Authorization: Bearer <api key>`. A key acts on behalf of its team and the user who created it.

**Rate limit.** 5 requests per second per API key. Requests over the limit get `429 Too Many Requests` with a `Retry-After` header (seconds).

**Tasks.** Tasks run in the background and usually finish in 60 to 90 seconds. Poll every 5 seconds or so, and stop once the status is `SUCCEEDED`.

| Endpoint | Body | Returns |
|---|---|---|
| `POST /v1/text-to-3d` | `prompt`: string, required, at most 600 characters | `202 {"result": "<task id>"}` |
| `GET /v1/text-to-3d/:id` | | Task: `status` (`PENDING`, `IN_PROGRESS`, `SUCCEEDED`), `progress`, `model_urls` |
| `POST /v1/remesh` | `input_task_id`: string, required, a finished task of yours<br>`target_polycount`: integer from 100 to 300,000, optional<br>`topology`: `"quad"` or `"triangle"`, default `"triangle"` | `202 {"result": "<task id>"}` |
| `GET /v1/remesh/:id` | | Task, same shape as above |
| `GET /v1/teams/me/members` | | `{"members": [...]}` with each member's role and status |
| `DELETE /v1/teams/me/members/:user_id` | | `204`. Owners and admins only. Removing a member immediately revokes their access to the team, including any API keys they created. |

Errors return a 4xx or 5xx status with `{"message": "..."}`.
