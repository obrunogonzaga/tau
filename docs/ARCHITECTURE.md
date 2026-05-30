# Tau Architecture

Tau has three layers:

1. CLI wrapper
2. Shared local modules
3. Pi extensions

## CLI Wrapper

`bin/tau.js` is the executable entrypoint. It loads config, handles `doctor`,
resolves command args, checks auth, writes a start log, prepares environment, and
spawns `pi`.

The wrapper should stay thin. Pure behavior belongs in `src/`.

## Shared Modules

`src/config.js` handles config loading, local overlay merge, and validation.

`src/args.js` handles profile, alias, prompt, theme, and extension arg
resolution.

These modules are testable without spawning `pi`.

## Extension Modules

`extensions/*.ts` are Pi adapters. They register commands, shortcuts, event
handlers, UI components, tools, and runtime hooks.

Reusable extension behavior lives in `extensions/lib/`:

- `subagent-store.js`: subagent state, rendering, event tracking, cancel, result
  cap.
- `safety.js`: redaction, secret-like text detection, sensitive path checks, and
  safe cross-agent file checks.
- `cc-brand.ts`: brand descriptors for `tau` and `picpay`.
- `cc-format.ts`: shared formatting helpers for Claude Code-style layout.

## Test Shape

Use three test styles:

- wrapper tests spawn a fake `pi` and verify forwarded args/env
- module tests call pure modules directly
- extension harness tests simulate Pi events and commands

Run:

```bash
npm test
npm run typecheck
```

## Documentation Map

- `README.md`: user entrypoint and setup.
- `docs/COMMANDS.md`: command reference.
- `CONTEXT.md`: domain vocabulary and design rules.
- `PROJECT.md`: milestone tracker.
- `PRD.md`: original product intent and decisions.
- `.pi/research/`: research notes for orchestration decisions.
