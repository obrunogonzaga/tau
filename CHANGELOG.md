# Changelog

## Unreleased

### Added

- Add global `my-pi` wrapper through package `bin`.
- Add startup banner with `MY_PI_BANNER=0` opt-out.
- Add settings path override through `MY_PI_SETTINGS_PATH`.
- Add wrapper logs under `<config-dir>/my-pi/logs/`.
- Add `fast` profile for `openai-codex/gpt-5.3-codex-spark`.
- Add `work` profile for `github-copilot/gpt-5.5`.
- Add `deep` profile for `openai-codex/gpt-5.5`.
- Add `ask`, `code`, and `review` command aliases.
- Add `plan`, `grill`, `fix`, `commit`, `pr`, and `debug` task aliases.
- Add default system prompt loading through `--append-system-prompt`.
- Add `MY_PI_NO_PROMPT=1` prompt opt-out.
- Add `--profile` override for aliases and direct commands.
- Add validation for missing or unknown profile names.
- Add Node test coverage for profile expansion.
- Add Node test coverage for task aliases and prompt loading.
- Add isolated `my-pi` session directory.

### Changed

- Route wrapper sessions through `PI_CODING_AGENT_DIR` and `PI_CODING_AGENT_SESSION_DIR`.
- Keep `my-pi` sessions separate from raw `pi` sessions.
- Replace placeholder system prompt with concise operational policy.
- Document quick start, wrapper knobs, profile usage, and task aliases.
