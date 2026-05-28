# tau

This repo stores my customized `pi` CLI layer: router, prompts, configs, extensions, scripts.

## What is inside

- `extensions/`  place for local extensions
- `.pi/`          project-local Pi resources
- `prompts/`     shared prompt templates
- `scripts/`     helper scripts
- `agent-settings.example.json` template for ~/.pi/agent/settings.json
- `config/tau.config.json` versioned profiles, aliases, and doctor key checks
- `bin/tau.js` wrapper/router to run current installed pi

## Quick start

1. Install dependencies from upstream if you haven't already:
   - `npm i -g @earendil-works/pi-coding-agent`
2. Start pi:
   - `npm run pi`
3. Start with default wrapper:
   - `npm run tau`
   - Starts with the Tau banner.
4. Start with fast profile:
   - `tau fast "summarize this repo"`
5. Start with work profile:
   - `tau work "implement this"`
6. Start with deep profile:
   - `tau deep "debug this hard bug"`
7. Start with router profile:
   - `tau router "work where model may change"`
8. Check local setup:
   - `tau doctor`
9. Run an extension preset:
   - `tau ext minimal "focus"`
10. Start orchestration mode:
   - `tau ext orchestrate "coordinate this"`
11. Prefer shorthand command:
   - `alias tauo='tau ext orchestrate'`
   - Use: `tauo "coordinate this"`

## Profiles

A profile is a named preset that expands to pi flags.

Profiles live in `config/tau.config.json`.

- `fast`: default quick answers: `--provider openai-codex --model gpt-5.3-codex-spark --thinking low`
- `work`: opt-in Copilot: `--provider github-copilot --model gpt-5.5 --thinking medium`
- `deep`: hard debugging/design: `--provider openai-codex --model gpt-5.5 --thinking xhigh`
- `router`: uncertain or long sessions: starts as `fast`, adds `--models openai-codex/gpt-5.3-codex-spark:low,openai-codex/gpt-5.5:xhigh`

## Model strategy

- Use `fast` for cheap questions, summaries, and quick checks.
- Use `work` only when explicitly choosing GitHub Copilot.
- Use `deep` for hard bugs, design review, and high-stakes reasoning.
- Use `router` when task shape is unclear or model switching via Ctrl+P may help.
- Provider assumptions: default uses `openai-codex/gpt-5.3-codex-spark:low`; `work` is the only Copilot profile; `router` cycles only OpenAI Codex models.

## Aliases

Aliases live in `config/tau.config.json`.

- `ask`: `-p`
- `code`: same as `fast`
- `review`: same as `fast`, plus `--tools read,grep,find,ls -p`
- `plan`: same as `fast`, plus read tools, print mode, planning prompt
- `grill`: same as `deep`, plus read tools, print mode, critique prompt
- `fix`: same as `fast`, plus focused fix prompt
- `commit`: same as `fast`, plus read/bash tools, print mode, commit prompt
- `pr`: same as `fast`, plus read/bash tools, print mode, PR prompt
- `debug`: same as `deep`, plus `--tools read,grep,find,ls,bash -p`
- `ship`: same as `fast`, plus implementation prompt and full tool access
- `continue`: same as `fast`, plus `--continue`
- `resume`: same as `fast`, plus `--resume`
- `fork`: same as `fast`, plus `--fork`
- `export`: same as `fast`, plus `--export`

Examples:

- `tau ask "what is this repo?"`
- `tau code "implement this"`
- `tau review "review current changes without running commands"`
- `tau plan "split M2 into phases"`
- `tau grill "attack this architecture"`
- `tau fix "repair failing tests"`
- `tau commit "prepare commit for current diff"`
- `tau pr "draft PR for current branch"`
- `tau debug "reproduce failing npm test without editing files"`
- `tau ship "implement M2"`
- `tau continue "finish the previous task"`
- `tau resume`
- `tau resume "continue with this prompt"`
- `tau fork session-123 "try another path"`
- `tau export session-123 session.html`

Session aliases:

- `continue`: continue the latest session.
- `resume`: choose or resume an existing session; extra prompt text is preserved.
- `fork`: branch from a session id; args after the id are preserved.
- `export`: export a session; optional output path is preserved.

Aliases can use a profile override:

- `tau review --profile deep "review diff"`
- `tau ship --profile deep "ship harder change"`
- `tau ship --profile router "ship with model cycling"`
- `tau plan --profile fast "quick plan"`
- `tau ship --profile work "force Copilot"`
- `tau --profile fast "quick task"`
- `tau --profile router "quick task with model cycling"`

`--profile` is only parsed at the start or right after an alias.

## Config

Edit `config/tau.config.json` to change profiles, aliases, task prompts, and provider key names checked by `doctor`.

- `defaultProfile`: fallback profile for direct commands and aliases.
- `profiles`: named provider/model/thinking presets.
- `profiles.router.models`: exact model cycling list.
- `aliases`: command presets with profile, extra args, and optional prompt.
- `extensionPresets`: named `tau ext` stacks.
- `providerKeys`: env var names checked by provider, values never printed. Use `[]` for providers that authenticate via session/login flow (no env token required). Ex.: default atual em `config/tau.config.json` usa `openai-codex: []` para login-based.

Use `TAU_CONFIG_PATH=./other-config.json tau ...` to test another config.

Invalid config fails before `pi` starts.

## Doctor

`tau doctor` prints concise checks:

- Node version >= 22.19
- `pi --version`
- tmux `extended-keys` when inside tmux
- settings file exists
- session directory is writable
- provider keys present/missing, without values

Required check failure exits non-zero. Missing provider keys are warnings.

## Extensions

- `tau ext minimal`: loads `tau-banner` + `status-footer`.
- `tau ext banner`: loads `tau-banner`.
- `tau ext focus`: loads `purpose-gate` + `task-discipline` + `pure-focus` + `status-footer`.
- `tau ext safe`: loads `tau-banner` + `purpose-gate` + `task-discipline` + `damage-control` + status/tool-counter footers.
- `tau ext damage`: loads `tau-banner` + `damage-control` + status/tool-counter footers.
- `tau ext damage-continue`: same as `damage`, with continue-safe prompt guidance.
- `tau ext team`: loads `tau-banner` + `persona-selector` + status/tool-counter footers.
- `tau ext chain`: loads `tau-banner` + `persona-selector` + status/tool-counter footers.
- `tau ext orchestrate`: loads `tau-banner` + `subagent-mode` + `session-replay` + `cross-agent-loader` + status/tool-counter footers.
- `purpose-gate`: asks for a session purpose in UI, shows it in widget/status/footer, and appends it to the turn system prompt.
- `task-discipline`: adds `/task add`, `/task start`, `/task done`, `/task set`, and `/task list`.
- `damage-control`: blocks destructive shell commands and sensitive path reads from `.pi/damage-control-rules.yaml`.
- `persona-selector`: adds `/system`, lists local personas, appends the selected persona to future system prompts, and shows it in status/footer.
- `subagent-mode`: adds `/sub <task>`, `/sub list`, `/sub show <id>`, and `/sub open <id>` for limited-tools background agents.
- `session-replay`: adds `/replay`, `/replay next`, `/replay prev`, and `/replay all` timeline output.
- `cross-agent-loader`: adds `/xload` to list safe `.claude`, `.gemini`, `.codex`, and `.pi` commands, agents, skills, and assets.
- `pure-focus`: hides header, footer, working row, and status labels.
- `tau-banner`: replaces the default Pi header with a compact Tau banner.
- `status-footer`: one-line model, context, and branch footer.
- `tool-counter-footer`: one-line cwd, branch, model, context, cost placeholder, and per-tool counts.
- Set `quietStartup: true` in settings to hide loaded resource lists too.
- Plain `tau` loads `tau-banner`; `tau ext focus` does not because it uses `pure-focus`.

Commands:

- `tau ext minimal "focus"`
- `tau ext banner`
- `tau ext safe "ship with purpose and task tracking"`
- `tau ext damage "inspect without destructive commands"`
- `tau ext damage-continue "continue after a blocked command"`
- `tau ext team "ship this with persona switching"`
- `tau ext chain "run plan build review"`
- `tau ext orchestrate "scan docs in a subagent"`
- `tauo "scan docs in a subagent"`
- `tau router -e extensions/pure-focus.ts "focus"`
- `npm run ext:banner`
- `npm run ext:minimal`
- `npm run ext:focus`
- `npm run ext:orchestrate`
- `npm run ext:safe`
- `npm run ext:team`
- `npm run ext:chain`
- `npm run ext:smoke`

Layout:

- `extensions/*.ts`: curated Tau extension entrypoints for explicit `tau ext` presets.
- `.pi/extensions/`: project-local Pi auto-discovery and `/reload`.
- `.pi/agents/`: local specialist agent prompts.
- `.pi/agents/teams.yaml`: team workflow definitions.
- `.pi/agents/agent-chain.yaml`: sequential workflow definitions.
- `.pi/teams/`: team docs and pointers.
- `.pi/chains/`: chain docs and pointers.
- `.pi/themes/`: local TUI themes.
- `.pi/rules/`: local policy and safety notes.
- `.pi/research/`: approved research notes before implementation.
- `.pi/damage-control-rules.yaml`: blocked command and sensitive path regexes.

Task commands:

- `/system list`
- `/system builder`
- `/system scout`
- `/purpose finish M8`
- `/task add implement purpose gate`
- `/task start 1`
- `/task done 1`
- `/task set 1 pending`
- `/task list`
- `/sub inspect docs for missing command examples`
- `/sub list`
- `/sub show 1`
- `/sub open 1`
- `/replay all`
- `/replay next`
- `/replay prev`
- `/xload`
- `/xload agent`

Agent files:

- `scout`: repo exploration, no-edit.
- `planner`: plan only, no-edit.
- `plan-reviewer`: challenges plans.
- `builder`: implementation.
- `reviewer`: code review.
- `documenter`: docs.
- `red-team`: security and failure modes.

Teams:

- `full`
- `plan-build`
- `info`
- `frontend`
- `security`

Chains:

- `plan-build-review`
- `scout-plan-build-review`
- `plan-review-plan`

Chain template conventions:

- `$INPUT`: current chain input or previous step result.
- `$ORIGINAL`: original user request that started the chain.

Damage-control feedback:

- Blocked commands return a safe next step instead of stopping the session.
- Edit `.pi/damage-control-rules.yaml` to tune blocked shell regexes and sensitive path regexes.

### Wrapper knobs

- `TAU_SETTINGS_PATH`: path to a custom settings file (defaults to `~/.pi/agent/settings.json`).
- `TAU_CONFIG_PATH`: path to a custom wrapper config.
- `TAU_BANNER`: custom banner text (set to `0` to disable).
- `TAU_NO_PROMPT=1`: disable `prompts/system-prompt.md` and task prompt appends.
- `TAU_SKIP_AUTH_CHECK=1`: skip wrapper-level provider auth preflight (useful when auth is session-based/OAuth).
- Logs: minimal startup logs are written to `<config-dir>/tau/logs/pi-YYYY-MM-DD.log`.
- Sessions: `tau` stores sessions in `~/.pi/tau/sessions`.

Examples:

- `TAU_SETTINGS_PATH=./profiles/dev.json npm run tau`
- `TAU_BANNER=my-ops-pi npm run tau`
- `TAU_NO_PROMPT=1 tau ask "raw upstream behavior"`
- `TAU_SKIP_AUTH_CHECK=1 tau`
- `tau ext orchestrate "coordenar revisao de arquitetura"`

## Versioning

This repo uses Git + GitHub + Changesets. Commits should follow conventional commits and branch names `type/description`.

Release flow:

1. Add a changeset after user-visible changes:
   - `npx changeset`
   - or `npm run changeset`
2. Apply pending changesets to version and changelog files:
   - `npx changeset version`
   - or `npm run release:version`
3. Publish only when this private package becomes publishable:
   - `npx changeset publish`
   - or `npm run release:publish`

Private caveat:

- `package.json` has `"private": true`.
- Changesets can version this package locally.
- Do not publish yet.
