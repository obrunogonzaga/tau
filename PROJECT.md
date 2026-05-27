# Project: Make tau more powerful

## Description

Turn `tau` from a thin flag wrapper into a personal operational router for Pi.

Current state:

- Wrapper around global `pi`
- Profiles: `fast`, `work`, `deep`
- Aliases: `ask`, `code`, `review`
- Isolated logs and sessions
- Tested profile and alias expansion

Goal:

- Add task-specific commands
- Add real prompt policy
- Add safer tool presets
- Add health checks
- Keep behavior small, tested, versioned

## Milestone 1: Router and prompt policy

- [x] MYPI-1 Add task aliases
- [x] MYPI-2 Add real system prompt
- [x] MYPI-3 Wire prompt into wrapper
- [x] MYPI-4 Document task commands

## Milestone 2: Safer tool modes

- [x] MYPI-5 Make review read-only
- [x] MYPI-6 Add debug mode
- [x] MYPI-7 Add ship mode
- [x] MYPI-8 Test tool policies

## Milestone 3: Model routing

- [x] MYPI-9 Add model cycling presets
- [x] MYPI-10 Add router profile
- [x] MYPI-11 Document model strategy

## Milestone 4: Session workflow

- [x] MYPI-12 Add continue alias
- [x] MYPI-13 Add resume alias
- [x] MYPI-14 Add fork alias
- [x] MYPI-15 Add HTML export alias

## Milestone 5: Config and health

- [x] MYPI-16 Move profiles to config file
- [x] MYPI-17 Move aliases to config file
- [x] MYPI-18 Add doctor command
- [x] MYPI-19 Check Node, Pi, tmux, settings, sessions

## Milestone 6: Release hygiene

- [x] MYPI-20 Configure Changesets
- [x] MYPI-21 Add first changeset
- [x] MYPI-22 Document release flow

## Milestone 7: Pi extension harness

- [x] MYPI-23 Add extension runner presets
- [x] MYPI-24 Add local extension directory structure
- [x] MYPI-25 Add just/npm recipes for extension stacks
- [x] MYPI-26 Add minimal status footer
- [x] MYPI-27 Add tool counter footer

## Milestone 8: Safety and focus extensions

- [x] MYPI-28 Add purpose gate
- [x] MYPI-29 Add task discipline mode
- [x] MYPI-30 Add damage-control rules
- [x] MYPI-31 Add damage-control continue mode

## Milestone 9: Specialist agents and workflows

- [x] MYPI-32 Add specialist agent definitions
- [x] MYPI-33 Add team definitions
- [x] MYPI-34 Add chain workflow definitions
- [x] MYPI-35 Add system persona selector

## Milestone 10: Advanced orchestration

- [x] MYPI-36 Add subagent mode
- [x] MYPI-37 Add session replay
- [x] MYPI-38 Add cross-agent command loader
- [x] MYPI-39 Research Pi-to-Pi communication
- [x] MYPI-40 Research meta-agent builder

## Issues

### MYPI-1: Add task aliases

Add aliases for common work modes:

- `fix`
- `plan`
- `grill`
- `commit`
- `pr`
- `debug`

Each alias should choose profile, tools, print mode, and prompt behavior.

Why:

Today `tau` mainly saves typing. Task aliases should encode how Bruno actually works. A planning run should not behave like an implementation run. A review run should not have the same write surface as a shipping run.

Expected outcome:

- `tau plan "..."` starts a planning-oriented run
- `tau grill "..."` starts a critical review of an idea or plan
- `tau fix "..."` starts focused bug-fix mode
- `tau commit "..."` helps prepare commit text and checks
- `tau pr "..."` helps prepare PR text and checklist
- `tau debug "..."` starts investigation mode

### MYPI-2: Add real system prompt

Replace `prompts/system-prompt.md` placeholder with Bruno-specific behavior:

- concise output
- inspect real state before answering
- prefer direct action
- protect secrets
- avoid broad edits
- respect planning vs execution mode

Why:

The current prompt file is empty placeholder content. A real prompt makes `tau` opinionated by default and keeps repeated behavior out of every command.

Expected outcome:

- shorter answers
- repo inspection before claims
- less generic AI tone
- clearer planning vs execution behavior
- safer handling of secrets and unrelated changes

### MYPI-3: Wire prompt into wrapper

Append the prompt with Pi's `--append-system-prompt` support.

Support opt-out for raw Pi behavior.

Why:

The prompt only matters if the wrapper loads it automatically. The opt-out keeps access to upstream Pi behavior when needed.

Expected outcome:

- default `tau` runs include the custom prompt
- `TAU_NO_PROMPT=1 tau ...` or equivalent disables it
- tests prove prompt args are forwarded correctly

### MYPI-4: Document task commands

Update `README.md` with all task aliases and examples.

Why:

The wrapper is becoming a small personal product. The README should be the command reference, not just setup notes.

Expected outcome:

- each alias has one short example
- profiles and aliases are separated clearly
- opt-out knobs are documented
- examples match tested behavior

### MYPI-5: Make review read-only

Change `review` tools to:

```bash
read,grep,find,ls
```

Avoid `bash` in default review mode.

Why:

Review should prioritize reading and findings. Allowing `bash` by default expands the surface area and can accidentally run commands during what should be inspection.

Expected outcome:

- `tau review "..."` forwards only read/search/list tools
- shell access moves to `debug` or another explicit mode
- tests lock the exact tool list

### MYPI-6: Add debug mode

Add `debug` alias with read tools plus `bash`.

Default to no write/edit tools.

Why:

Debugging needs commands, tests, logs, and repro steps. It does not always need file edits. This mode gives investigation power without automatically becoming implementation mode.

Expected outcome:

- `tau debug "..."` includes read/search/list/bash
- no edit/write tools by default
- useful for reproducing failures and inspecting runtime state

### MYPI-7: Add ship mode

Add `ship` alias for implementation work with full tools.

Use work or deep profile depending on override.

Why:

Implementation should be explicit. `ship` becomes the mode where edits, tests, docs, and final verification are expected.

Expected outcome:

- `tau ship "..."` starts implementation mode
- full tool access is available
- `--profile deep` can be used for harder changes
- README explains that this is the mutating mode

### MYPI-8: Test tool policies

Add tests for every alias and tool list.

Why:

The wrapper's value is in predictable expansion. Tests prevent aliases from silently gaining the wrong model, prompt, or tools.

Expected outcome:

- each alias has at least one test
- read-only modes prove no write/edit tools
- debug proves bash exists
- ship proves full-tool behavior or intentionally omitted tool allowlist

### MYPI-9: Add model cycling presets

Use Pi's `--models` flag for model switching.

Create a controlled model list for daily work.

Why:

Pi supports Ctrl+P model cycling. `tau` should preload the models Bruno actually wants instead of relying on global provider catalogs.

Expected outcome:

- daily model list is encoded in one place
- default session can cycle between fast/work/deep candidates
- model list avoids unavailable or noisy catalog entries

### MYPI-10: Add router profile

Add profile that starts with a good default model and allows fast switching.

Why:

Sometimes the right model is not known upfront. A router profile should start with a sane default and expose a small approved model set for switching.

Expected outcome:

- `tau router "..."` starts with daily default
- `--models` includes approved alternates
- profile is documented with when to use it

### MYPI-11: Document model strategy

Explain when to use fast, work, deep, and router.

Why:

Model names change and personal defaults drift. A short strategy keeps future edits coherent.

Expected outcome:

- `fast`: cheap quick answers
- `work`: normal coding
- `deep`: hard debugging/design
- `router`: uncertain tasks or long sessions
- notes explain provider assumptions

### MYPI-12: Add continue alias

Add alias for `pi --continue`.

Why:

Continuing the last session is common enough to deserve a short command.

Expected outcome:

- `tau continue "..."` forwards `--continue`
- alias can accept an extra prompt
- README shows example usage

### MYPI-13: Add resume alias

Add alias for `pi --resume`.

Why:

Resume lets Bruno pick a previous session without remembering Pi flags.

Expected outcome:

- `tau resume` forwards `--resume`
- optional prompt args are preserved
- behavior is tested

### MYPI-14: Add fork alias

Add alias for `pi --fork`.

Why:

Forking a session is useful when exploring a different path without mutating the original thread history.

Expected outcome:

- `tau fork <id>` forwards `--fork <id>`
- prompt args after the id are preserved
- README explains the difference between resume and fork

### MYPI-15: Add HTML export alias

Add alias for `pi --export`.

Why:

Exporting sessions to HTML makes useful runs easier to review, archive, or share.

Expected outcome:

- `tau export <session>` forwards `--export <session>`
- optional output path is supported if Pi supports it
- docs include one example

### MYPI-16: Move profiles to config file

Move profile definitions out of `bin/tau.js`.

Keep wrapper as executor.

Why:

Profiles are product configuration, not wrapper mechanics. Moving them out makes changes easier and reduces risk in the executable.

Expected outcome:

- profiles live in a config file
- wrapper loads config at startup
- invalid config fails with a clear error
- existing profile tests still pass

### MYPI-17: Move aliases to config file

Move alias definitions out of `bin/tau.js`.

Keep tests focused on external behavior.

Why:

Aliases will grow faster than wrapper logic. Config keeps the command catalog easy to edit.

Expected outcome:

- aliases live beside profiles
- profile override behavior still works
- tests verify output args, not implementation details

### MYPI-18: Add doctor command

Add `tau doctor`.

It should check local prerequisites without exposing secrets.

Why:

This setup previously had Node, tmux, provider, and env-var issues. A doctor command turns that debugging knowledge into a repeatable check.

Expected outcome:

- `tau doctor` prints concise pass/fail checks
- no secret values are printed
- command exits non-zero when required checks fail

### MYPI-19: Check Node, Pi, tmux, settings, sessions

Doctor should verify:

- Node version
- `pi` availability
- tmux extended keys
- settings path
- session path
- API key presence by provider name only

Why:

These are the known fragile parts of the local Pi setup. The doctor command should focus on things that break actual usage.

Expected outcome:

- Node version is compatible
- `pi --version` works
- tmux extended-key config is detectable when inside tmux
- settings file exists
- session directory is writable
- provider keys are reported as present/missing, never printed

### MYPI-20: Configure Changesets

Install and configure Changesets for local version tracking.

Why:

The repo already documents Changesets, but it is not configured. Adding it makes changes traceable as the wrapper becomes more product-like.

Expected outcome:

- Changesets config exists
- package scripts are added if useful
- generated files are committed
- README release notes match real commands

### MYPI-21: Add first changeset

Create initial changeset for project tracking and wrapper evolution.

Why:

The first changeset proves the workflow works and records the first meaningful evolution of the wrapper.

Expected outcome:

- `.changeset/*.md` exists
- change type is appropriate
- summary is short and useful

### MYPI-22: Document release flow

Document:

```bash
npx changeset
npx changeset version
npx changeset publish
```

Publishing can stay out of scope until package is public.

Why:

Release commands should be explicit before the package grows. Publishing may remain private, but versioning should be clear.

Expected outcome:

- README has release section
- private-package caveat is clear
- versioning steps are copy-pasteable

## Ideas from pi-vs-claude-code

Reference repo:

- `https://github.com/disler/pi-vs-claude-code`
- inspected HEAD: `3ce16391a1f4d244f9204578833506580273fe20`

Useful ideas found there:

- extension stacks launched with recipes
- minimal footer and tool/cost observability
- purpose gate before work starts
- task list discipline during agent runs
- damage-control rules for dangerous tools and secret paths
- specialist agents such as scout, planner, builder, reviewer, documenter, red-team
- team and chain YAML workflows
- system prompt/persona switching
- cross-agent discovery from `.claude`, `.gemini`, `.codex`, and `.pi`
- session replay UI
- subagent orchestration
- Pi-to-Pi communication
- Pi meta-agent for building Pi extensions, prompts, themes, skills, and configs

These are not implemented in `tau` yet.

### MYPI-23: Add extension runner presets

Add wrapper support for named extension stacks.

Why:

The reference repo treats Pi extensions as reusable harnesses, not one-off flags. `tau` should let Bruno run curated stacks without remembering every `-e extensions/*.ts` combination.

Expected outcome:

- `tau ext minimal`
- `tau ext focus`
- `tau ext safe`
- `tau ext team`
- wrapper expands each stack into Pi `-e` flags
- unknown stacks fail with clear error

### MYPI-24: Add local extension directory structure

Create a first-class local extension layout.

Why:

The current repo has `extensions/my-first-extension/README.md`, but no real extension source convention. A clear layout is needed before copying or writing actual Pi extensions.

Expected outcome:

- `extensions/*.ts` holds extension entrypoints
- `.pi/` holds Pi-local settings, agents, teams, chains, themes, and rules
- README explains what belongs where
- generated/runtime session data stays gitignored

### MYPI-25: Add just/npm recipes for extension stacks

Add simple commands for common extension launches.

Why:

The reference repo uses a `justfile` to make extension demos easy. This repo can use npm scripts or `just`, but the important part is one-command startup.

Expected outcome:

- command for plain Pi
- command for minimal UI
- command for safety mode
- command for team mode
- command for chain mode
- command for all local extension smoke tests if possible

### MYPI-26: Add minimal status footer

Add a compact footer extension showing model and context usage.

Why:

Pi can expose runtime state in the TUI. A minimal footer gives useful signal without visual noise.

Expected outcome:

- current model visible
- context usage visible
- footer stays one line
- extension can be loaded alone or stacked with other extensions

### MYPI-27: Add tool counter footer

Add richer observability for tool calls, cwd, branch, tokens, and cost.

Why:

Tool visibility helps understand what an agent is doing and how expensive a run is becoming.

Expected outcome:

- per-tool counts visible
- cwd and git branch visible
- token/cost stats visible when available
- no crash when stats are unavailable

### MYPI-28: Add purpose gate

Force a session purpose before the agent can work.

Why:

This matches Bruno's preference for clear intent. It prevents long sessions from drifting into unrelated work.

Expected outcome:

- session asks for purpose at startup
- purpose appears in a persistent widget or status line
- user prompts are blocked until purpose exists
- purpose is appended to the system prompt

### MYPI-29: Add task discipline mode

Add a task list extension that forces visible work items.

Why:

The reference repo's `tilldone` idea is useful: before complex work, the agent should define tasks and mark progress. This is stronger than an invisible plan in chat.

Expected outcome:

- agent can create task list
- task states: pending, in progress, done
- progress visible in footer/widget
- unfinished tasks nudge continuation before final answer

### MYPI-30: Add damage-control rules

Add path and command safety rules.

Why:

Pi defaults are powerful. A local damage-control layer should block known destructive commands and sensitive paths.

Expected outcome:

- `.pi/damage-control-rules.yaml`
- blocks destructive bash patterns
- blocks secret path reads
- protects lockfiles/build outputs where appropriate
- logs blocked actions without leaking secrets

### MYPI-31: Add damage-control continue mode

Return actionable feedback when a tool call is blocked instead of simply aborting.

Why:

Hard blocking can end useful work. Continue mode lets the agent adapt: skip secret reads, choose safer commands, or ask the user when destructive action is required.

Expected outcome:

- blocked tool returns explanation
- agent is told how to proceed safely
- destructive intent stops for user decision
- non-destructive secret checks are skipped instead of retried

### MYPI-32: Add specialist agent definitions

Add `.pi/agents/*.md` personas for common roles.

Why:

Specialist prompts make work modes sharper than one generic system prompt.

Expected outcome:

- `scout`: repo exploration, no edits
- `planner`: plan only, no edits
- `plan-reviewer`: challenge plans
- `builder`: implementation
- `reviewer`: code review
- `documenter`: docs
- `red-team`: security and failure modes

### MYPI-33: Add team definitions

Add `.pi/agents/teams.yaml`.

Why:

Teams let us group specialists by workflow. This gives Bruno repeatable modes like full build, frontend, info gathering, or security review.

Expected outcome:

- `full`
- `plan-build`
- `info`
- `frontend`
- `security`
- each team references existing agent definitions

### MYPI-34: Add chain workflow definitions

Add `.pi/agents/agent-chain.yaml`.

Why:

Chains are useful when order matters. A plan-build-review flow should always run in the same sequence.

Expected outcome:

- `plan-build-review`
- `scout-plan-build-review`
- `plan-review-plan`
- each step has agent and prompt template
- `$INPUT` and `$ORIGINAL` conventions documented

### MYPI-35: Add system persona selector

Add or adapt a `/system` command to switch active persona.

Why:

Sometimes Bruno wants to change mode inside the same session without restarting Pi.

Expected outcome:

- scans local `.pi/agents`
- lists available personas
- selected persona affects future system prompt
- current persona is visible in status/footer

### MYPI-36: Add subagent mode

Research and add a simple `/sub <task>` flow.

Why:

Some tasks are independent: inspect docs, scan a module, compare approaches. Subagents can work in parallel while the main agent stays focused.

Expected outcome:

- background subagent can run a prompt
- result is reported back to main session
- status shows running/done/error
- default subagent tools are limited unless explicitly expanded

### MYPI-37: Add session replay

Add session timeline replay.

Why:

Long agent runs become hard to audit. Replay makes prompts, assistant messages, and tool calls easier to inspect after the fact.

Expected outcome:

- `/replay` command
- timeline of current session
- expandable entries
- keyboard navigation

### MYPI-38: Add cross-agent command loader

Load commands or agents from nearby AI tool folders.

Why:

Bruno already uses multiple agent ecosystems. Pi should reuse useful `.claude`, `.gemini`, `.codex`, and `.pi` assets instead of duplicating everything.

Expected outcome:

- scan project and home dirs
- register compatible markdown commands
- list discovered skills and agents
- avoid loading secrets or runtime files

### MYPI-39: Research Pi-to-Pi communication

Evaluate local and networked Pi-to-Pi messaging.

Why:

The reference repo has both local peer communication and HTTP/SSE network communication. This could matter for laptop plus Hermes/remote agent workflows.

Expected outcome:

- decide local-only vs networked first
- document security model
- define auth/token handling
- identify minimal useful workflow
- no implementation until design is approved

### MYPI-40: Research meta-agent builder

Research a Pi meta-agent that builds Pi assets.

Why:

The reference repo's Pi-Pi idea could make this repo self-improving: ask for an extension, prompt, theme, skill, or config, and have specialist agents generate it.

Expected outcome:

- define scope for a first meta-agent
- choose experts: extension, config, prompt, skill, theme
- require docs lookup before generation
- require tests or smoke checks for generated assets
- keep generated tools reviewable before activation
