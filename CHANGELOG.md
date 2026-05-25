# Changelog

## Unreleased

### Added

- Add global `my-pi` wrapper through package `bin`.
- Add startup banner with `MY_PI_BANNER=0` opt-out.
- Add settings path override through `MY_PI_SETTINGS_PATH`.
- Add wrapper logs under `<config-dir>/my-pi/logs/`.
- Add `fast` profile for `openai-codex/gpt-5.3-codex-spark`.
- Add `work` profile for `github-copilot/gpt-5.5`.
- Add `deep` profile for `openai/gpt-5.5`.
- Add Node test coverage for profile expansion.
- Add isolated `my-pi` session directory.

### Changed

- Route wrapper sessions through `PI_CODING_AGENT_DIR` and `PI_CODING_AGENT_SESSION_DIR`.
- Keep `my-pi` sessions separate from raw `pi` sessions.
- Document quick start, wrapper knobs, and profile usage.
