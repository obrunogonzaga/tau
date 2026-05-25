# PRD: my-pi customization layer

## Problem Statement

`pi` works globally, but personal defaults, model choices, sessions, logs, and local conventions are scattered across shell state and upstream defaults.

## Solution

Create `my-pi`, a thin local wrapper around the installed `pi` CLI. It keeps personal behavior versioned in this repo while still using the current global `pi` binary.

## User Stories

1. As Bruno, I want to run `my-pi` globally, so that I do not need to remember repo paths.
2. As Bruno, I want named profiles, so that common model setups are one command.
3. As Bruno, I want a fast profile, so that quick tasks use a cheap fast coding model.
4. As Bruno, I want a work profile, so that daily coding uses my Copilot-backed model setup.
5. As Bruno, I want a deep profile, so that hard debugging and design tasks use maximum reasoning.
6. As Bruno, I want wrapper logs, so that I can inspect how sessions started.
7. As Bruno, I want isolated wrapper sessions, so that raw `pi` history stays separate from `my-pi` history.
8. As Bruno, I want quick aliases, so that repeated Pi command shapes are easy to run.
9. As Bruno, I want configurable settings paths, so that I can test profiles without replacing default Pi config.
10. As Bruno, I want tests for wrapper behavior, so that profile changes do not silently break.
11. As Bruno, I want docs, so that future agents know how to evolve the wrapper.

## Implementation Decisions

- Keep `my-pi` as a Node executable wrapper.
- Use the global `pi` command from `PATH`.
- Keep profiles in a single in-code map for now.
- Expand profile names before forwarding args to `pi`.
- Use `MY_PI_SETTINGS_PATH` for alternate settings files.
- Use `MY_PI_BANNER=0` to suppress startup banner.
- Store `my-pi` sessions in a dedicated session directory.
- Use aliases for quick ask, coding mode, and read-only review mode.
- Support `--profile` overrides for aliases and direct commands.
- Parse `--profile` only before free-form prompt arguments.
- Use Node built-in test runner.
- Keep release/changelog docs manual until Changesets is configured.

## Testing Decisions

- Test external behavior: given `my-pi fast`, verify forwarded `pi` args.
- Use a fake `pi` executable in a temporary PATH.
- Avoid testing implementation internals like function names.
- Run `npm test` before commits.

## Out of Scope

- Publishing this package.
- Full Changesets setup.
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
my-pi ask "question"    # pi -p "question"
my-pi code "task"       # pi with work profile
my-pi review "changes"  # pi with work profile, shell-capable review tools, print mode
```

Aliases can override the model profile:

```bash
my-pi review --profile deep "review diff"
```
