# Agent Behavioral Rules

- **No Auto Commit & Push**: Do not run `git add`, `git commit`, or `git push`. Changes must only be committed or pushed when explicitly requested by the user.
- **No Fallbacks**: Never add any mock, static, or fallback logic for APIs, generation, or services. If an API fails, propagate the error; do not implement a fallback.
- **Clean Production Grade Code**: Always write clean, robust, strictly-typed production-grade code. No hacky patches, no pseudo-code, and no temporary shortcuts.
- **Never Wipe or Clean Database Without Permission**: Under no circumstances should the database ever be wiped, cleaned, truncated, or reset unless the user explicitly commands it in that exact prompt. Never run seed, migration resets, or delete operations that clear database tables autonomously.

