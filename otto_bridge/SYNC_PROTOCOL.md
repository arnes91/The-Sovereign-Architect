# Otto Bridge Sync Protocol

## Overview
This document defines the synchronization protocol between the Brzi AI Studio and external agpt.co Otto Copilot agents.

## Connection Flow
1. **Handshake:** The client initiates a connection to the Otto Copilot endpoint.
2. **Context Sync:** The client sends the current `agent_registry.json` state.
3. **Heartbeat:** A periodic heartbeat (`heartbeat.json`) is sent every 30 seconds to maintain the connection.
4. **Task Execution:** Workflows are triggered via the `/execute` endpoint.

## Data Structures
See `config.json` and `agent_registry.json` for schema definitions.
