---
name: Vite dependency cache
description: Runtime dependency mismatches can persist after workspace catalog upgrades.
---

After changing shared dependency versions, Vite's optimized dependencies can retain an older runtime even when the installed packages agree.

**Why:** A React patch update left the development prebundle using an older React DOM runtime despite matching installed versions and a workflow restart.

**How to apply:** If a runtime version mismatch persists after an upgrade, compare the installed versions with the generated prebundle before changing dependencies again. Regenerate only the affected Vite cache.