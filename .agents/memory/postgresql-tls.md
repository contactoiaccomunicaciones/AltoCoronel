---
name: PostgreSQL TLS
description: The app's Replit PostgreSQL endpoint requires TLS for node-postgres connections.
---

Configure the shared `pg` pool with TLS when connecting through `DATABASE_URL`.

**Why:** The development API returned `SSL/TLS required` on its first database read. Enabling TLS allowed the same connection to reach PostgreSQL; its next error was the missing application table, confirming that transport was fixed.

**How to apply:** Keep TLS enabled in the shared database pool and verify access with a read-only query before changing schema or data.
