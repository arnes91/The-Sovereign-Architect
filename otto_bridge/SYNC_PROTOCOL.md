# BRZI_SYNC_v1 — Bidirectional Sync Protocol

**Version:** 1.0.0
**Updated:** 2026-03-20
**Status:** ACTIVE

## Architecture

**Shared Brain:** `github:arnes91/The-Sovereign-Architect/otto_bridge/`

### Directions

| Direction | Path | Description |
|-----------|------|-------------|
| **Inbound** | `inbox/` | EliClaw/Antigravity → Otto: Command files |
| **Outbound** | `outbox/` | Otto → EliClaw/Antigravity: Result files |
| **State** | `heartbeat.json` | Shared system status beacon |

## Command Schema

JSON files in `inbox/` named `{timestamp}_{command_type}.json`:

```json
{
  "id": "uuid-v4",
  "command": "research_topic | generate_image | generate_video | draft_content | check_youtube_stats | check_gmail | run_heartbeat | custom_task",
  "source": "eliclaw | antigravity | manual",
  "timestamp": "ISO-8601",
  "priority": "critical | high | normal | low",
  "payload": {
    "topic": "string",
    "prompt": "string",
    "target_platform": "string",
    "reply_to_thread": 19,
    "additional_context": "string"
  },
  "status": "pending"
}
```

## Result Schema

JSON files in `outbox/` named `{timestamp}_{result_type}.json`:

```json
{
  "id": "uuid-v4",
  "command_id": "references original command",
  "status": "completed | failed | partial",
  "timestamp": "ISO-8601",
  "result": {
    "summary": "string",
    "data": {},
    "artifacts": ["urls"]
  },
  "delivered_to": {
    "telegram_thread": 19,
    "github_path": "otto_bridge/outbox/..."
  }
}
```

## Telegram Routing

| Topic | Thread ID | Use For |
|-------|-----------|--------|
| 00_SYSTEM | 19 | heartbeat, system status, errors |
| 01_TSA_DEV | 20 | dev updates, code changes, deployment |
| 02_BRZI_ARZI | 22 | music updates, distrokid, releases |
| 03_GENERAL | 1 | research results, content drafts, misc |

**Bot:** @BrziAiBot (EliClaw)
**Group:** BRZI_STUDIO_HUB
**Chat ID:** -1003792999796

## Otto Agents

| Agent | Schedule | Function |
|-------|----------|----------|
| ELI Heartbeat v2.1 | Hourly | System monitoring + intelligence briefing |
| Otto Command Dispatcher | Every 15 min | Reads inbox, dispatches tasks, writes results |
| Hedra Video Generator | On-demand | Character video generation |

## How EliClaw Triggers Otto

1. EliClaw receives a command (Telegram or cron)
2. EliClaw writes a command JSON to `otto_bridge/inbox/` via GitHub API
3. Otto Command Dispatcher picks it up on next 15-min cycle
4. Otto dispatches to the right tool (research, image gen, content draft, etc.)
5. Otto writes result to `otto_bridge/outbox/` and sends to Telegram
6. EliClaw reads result from outbox when needed

## Example: EliClaw Triggers Research

```json
{
  "id": "cmd-001",
  "command": "research_topic",
  "source": "eliclaw",
  "timestamp": "2026-03-20T14:00:00Z",
  "priority": "high",
  "payload": {
    "topic": "AI music generation trends March 2026",
    "reply_to_thread": 22
  },
  "status": "pending"
}
```

---
*Protocol sealed with EliClaw∞Sigil — Sovereignty through sync.*