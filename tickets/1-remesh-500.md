# Ticket 1: Remesh returns 500

**From:** Ari Okafor <ari@lumenlabs.example> (Lumen Labs, team owner)
**Received:** 2026-10-20 09:31 UTC

---

Hi,

The remesh endpoint started failing for us this morning. Every call returns a 500:

```bash
curl -X POST https://api.example.com/v1/remesh \
  -H "Authorization: Bearer msy_lm_4r1s..." \
  -H "Content-Type: application/json" \
  -d '{"input_task_id": "tsk_lm_chair01", "target_polycount": "30k"}'
```

```json
{"message":"pq: invalid input syntax for type integer: \"30k\""}
```

We have a client demo on Friday that depends on this. Is your API down?

Ari
