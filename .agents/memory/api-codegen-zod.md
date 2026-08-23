---
name: API codegen and Zod compatibility
description: OpenAPI integer schemas can generate Zod 4-only helpers in this workspace's Zod 3 runtime.
---

Use numeric schemas for generated API contracts when the installed Zod runtime does not expose `zod.int()`, or upgrade the workspace Zod dependency as a coordinated change.

**Why:** A generated client can typecheck while the API server still crashes at module evaluation when generated Zod validators call an unavailable runtime helper.

**How to apply:** After every OpenAPI change, run codegen and the full workspace typecheck, then restart the API workflow and inspect startup logs.