# Tau Context

Tau is a local command layer for the globally installed `pi` CLI. It keeps
Bruno's preferred profiles, prompts, safety rules, UI extensions, sessions, and
release hygiene versioned in one repo.

## Product Terms

### Tau

The wrapper and local customization layer. Tau should stay small: it chooses how
`pi` starts, then lets `pi` remain the runtime.

### Pi

The upstream CLI runtime. Tau invokes the `pi` binary from `PATH`; it does not
vendor or replace Pi.

### Profile

A named model setup in `config/tau.config.json`. A profile expands to provider,
model, thinking level, and optional model cycling args.

### Alias

A task-shaped Tau command such as `ask`, `plan`, `review`, `debug`, or `ship`.
Aliases encode tool policy and prompt posture for repeated workflows.

### Extension Preset

A named stack of Pi extensions started by `tau ext <preset>`. Presets compose
UI, safety, focus, persona, orchestration, and brand behavior.

### Extension

A Pi runtime adapter in `extensions/`. Extensions should keep Pi-specific API
calls at the edge and move reusable logic into `extensions/lib/`.

### Brand

A visual and copy identity for Claude Code-style layout extensions. Current
brands are `tau` and `picpay`.

### Session

A Pi conversation started through Tau. Tau sessions live under
`~/.pi/tau/sessions` so raw Pi sessions stay separate.

### Doctor

Tau's health check command. It verifies local prerequisites such as Node, Pi,
tmux, settings, sessions, profile auth, and local config.

## Orchestration Terms

### Subagent

A limited-tools background Pi session used for isolated research. It is tracked
by status, prompt, elapsed time, summary, result preview, and recent events.

### Replay

An in-session audit timeline. It records prompts, assistant messages, and
redacted tool calls.

### Cross-Agent Loader

The `/xload` extension. It lists safe local assets from `.claude`, `.gemini`,
`.codex`, and `.pi` folders.

## Safety Terms

### Damage Control

Runtime blocking for destructive commands and sensitive paths. It should block
obvious footguns and steer the agent toward narrower safe alternatives.

### Sensitive Path

A path that may contain credentials, tokens, private keys, auth state, logs, or
cache data.

### Redaction

Replacement of secret-like keys or values with `[redacted]` before replay or
other audit output.

## Design Rules

- Tau remains a wrapper, not a fork of Pi.
- Config changes live in `config/tau.config.json`; per-machine differences use
  `TAU_LOCAL_CONFIG`.
- Reusable logic belongs in `src/` or `extensions/lib/`.
- Pi-specific calls stay in adapters such as `bin/tau.js` or `extensions/*.ts`.
- Safety rules should be centralized, tested, and reused.
- Behavior changes need focused tests.
- Release-visible changes need a Changeset.
