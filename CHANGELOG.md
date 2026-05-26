# Changelog

## Unreleased

### Added

- Add global `tau` wrapper through package `bin`.
- Add startup banner with `TAU_BANNER=0` opt-out.
- Add settings path override through `TAU_SETTINGS_PATH`.
- Add wrapper logs under `<config-dir>/tau/logs/`.
- Add `fast` profile for `openai-codex/gpt-5.3-codex-spark`.
- Add `work` profile for `github-copilot/gpt-5.5`.
- Add `deep` profile for `openai-codex/gpt-5.5`.
- Add `router` profile with approved daily `--models` cycling.
- Add `ask`, `code`, and `review` command aliases.
- Add `plan`, `grill`, `fix`, `commit`, `pr`, and `debug` task aliases.
- Add `ship` implementation alias.
- Add `continue`, `resume`, `fork`, and `export` session aliases.
- Add versioned `config/tau.config.json` for profiles and aliases.
- Add `tau doctor` for local health checks.
- Add default system prompt loading through `--append-system-prompt`.
- Add `TAU_NO_PROMPT=1` prompt opt-out.
- Add `--profile` override for aliases and direct commands.
- Add validation for missing or unknown profile names.
- Add Node test coverage for profile expansion.
- Add Node test coverage for task aliases and prompt loading.
- Add exact tool policy coverage for `review`, `debug`, and `ship`.
- Add exact arg coverage for session aliases.
- Add exact model cycling coverage for `router`.
- Add exact coverage for config loading and doctor behavior.
- Add isolated `tau` session directory.
- Add Changesets config and release scripts.
- Add `tau ext` extension presets.
- Add compact Tau banner extension.
- Add status and tool-counter footer extensions.
- Add local `.pi/` resource layout.
- Add npm recipes for extension stacks.

### Changed

- Rename wrapper, command, config, tests, sessions, and docs to `tau`.
- Route wrapper sessions through `PI_CODING_AGENT_DIR` and `PI_CODING_AGENT_SESSION_DIR`.
- Keep `tau` sessions separate from raw `pi` sessions.
- Replace placeholder system prompt with concise operational policy.
- Document quick start, wrapper knobs, profile usage, and task aliases.
- Document model strategy for `fast`, `work`, `deep`, and `router`.
- Make `review` read-only with `read,grep,find,ls`.
- Make `openai-codex/gpt-5.3-codex-spark:low` the default for direct commands, aliases, and `router`.
- Keep `github-copilot` limited to explicit `work` profile usage.
- Move profile and alias definitions out of `bin/tau.js`.
- Document extension presets and local Pi resource layout.
