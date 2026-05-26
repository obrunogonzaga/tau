# PRD: tau customization layer

## Problem Statement

`pi` works globally, but personal defaults, model choices, sessions, logs, and local conventions are scattered across shell state and upstream defaults.

## Solution

Create `tau`, a thin local wrapper around the installed `pi` CLI. It keeps personal behavior versioned in this repo while still using the current global `pi` binary.

## User Stories

1. As Bruno, I want to run `tau` globally, so that I do not need to remember repo paths.
2. As Bruno, I want named profiles, so that common model setups are one command.
3. As Bruno, I want a fast profile, so that quick tasks use a cheap fast coding model.
4. As Bruno, I want a work profile, so that daily coding uses my Copilot-backed model setup.
5. As Bruno, I want a deep profile, so that hard debugging and design tasks use maximum reasoning.
6. As Bruno, I want wrapper logs, so that I can inspect how sessions started.
7. As Bruno, I want isolated wrapper sessions, so that raw `pi` history stays separate from `tau` history.
8. As Bruno, I want quick aliases, so that repeated Pi command shapes are easy to run.
9. As Bruno, I want configurable settings paths, so that I can test profiles without replacing default Pi config.
10. As Bruno, I want tests for wrapper behavior, so that profile changes do not silently break.
11. As Bruno, I want docs, so that future agents know how to evolve the wrapper.

## Implementation Decisions

- Keep `tau` as a Node executable wrapper.
- Use the global `pi` command from `PATH`.
- Keep profiles in `config/tau.config.json`.
- Expand profile names before forwarding args to `pi`.
- Use `TAU_SETTINGS_PATH` for alternate settings files.
- Use `TAU_BANNER=0` to suppress startup banner.
- Store `tau` sessions in a dedicated session directory.
- Use aliases for quick ask, coding mode, and read-only review mode.
- Support `--profile` overrides for aliases and direct commands.
- Parse `--profile` only before free-form prompt arguments.
- Use Node built-in test runner.
- Use Changesets for local version and changelog hygiene.

## Testing Decisions

- Test external behavior: given `tau fast`, verify forwarded `pi` args.
- Use a fake `pi` executable in a temporary PATH.
- Avoid testing implementation internals like function names.
- Run `npm test` before commits.

## Out of Scope

- Publishing this package.
- Interactive profile management.
- Automatic upstream `pi` updates.
- Secret or API key management.

## Further Notes

The current `fast` profile expands to:

```bash
pi --provider openai-codex --model gpt-5.3-codex-spark --thinking low
```

The current `work` profile expands to:

```bash
pi --provider github-copilot --model gpt-5.5 --thinking medium
```

The current `deep` profile expands to:

```bash
pi --provider openai-codex --model gpt-5.5 --thinking xhigh
```

The current aliases expand to:

```bash
tau ask "question"    # pi -p "question"
tau code "task"       # pi with fast profile
tau review "changes"  # pi with read-only tools, print mode
```

Aliases can override the model profile:

```bash
tau review --profile deep "review diff"
```
