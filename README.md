# my-pi-version

This repo stores my customized `pi` CLI layer: router, prompts, configs, extensions, scripts.

## What is inside

- `extensions/`  place for local extensions
- `prompts/`     shared prompt templates
- `scripts/`     helper scripts
- `agent-settings.example.json` template for ~/.pi/agent/settings.json
- `config/my-pi.config.json` versioned profiles, aliases, and doctor key checks
- `bin/my-pi.js` wrapper/router to run current installed pi

## Quick start

1. Install dependencies from upstream if you haven't already:
   - `npm i -g @earendil-works/pi-coding-agent`
2. Start pi:
   - `npm run pi`
3. Start with default wrapper:
   - `npm run my-pi`
4. Start with fast profile:
   - `my-pi fast "summarize this repo"`
5. Start with work profile:
   - `my-pi work "implement this"`
6. Start with deep profile:
   - `my-pi deep "debug this hard bug"`
7. Start with router profile:
   - `my-pi router "work where model may change"`
8. Check local setup:
   - `my-pi doctor`

## Profiles

A profile is a named preset that expands to pi flags.

Profiles live in `config/my-pi.config.json`.

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

Aliases live in `config/my-pi.config.json`.

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

- `my-pi ask "what is this repo?"`
- `my-pi code "implement this"`
- `my-pi review "review current changes without running commands"`
- `my-pi plan "split M2 into phases"`
- `my-pi grill "attack this architecture"`
- `my-pi fix "repair failing tests"`
- `my-pi commit "prepare commit for current diff"`
- `my-pi pr "draft PR for current branch"`
- `my-pi debug "reproduce failing npm test without editing files"`
- `my-pi ship "implement M2"`
- `my-pi continue "finish the previous task"`
- `my-pi resume`
- `my-pi resume "continue with this prompt"`
- `my-pi fork session-123 "try another path"`
- `my-pi export session-123 session.html`

Session aliases:

- `continue`: continue the latest session.
- `resume`: choose or resume an existing session; extra prompt text is preserved.
- `fork`: branch from a session id; args after the id are preserved.
- `export`: export a session; optional output path is preserved.

Aliases can use a profile override:

- `my-pi review --profile deep "review diff"`
- `my-pi ship --profile deep "ship harder change"`
- `my-pi ship --profile router "ship with model cycling"`
- `my-pi plan --profile fast "quick plan"`
- `my-pi ship --profile work "force Copilot"`
- `my-pi --profile fast "quick task"`
- `my-pi --profile router "quick task with model cycling"`

`--profile` is only parsed at the start or right after an alias.

## Config

Edit `config/my-pi.config.json` to change profiles, aliases, task prompts, and provider key names checked by `doctor`.

- `defaultProfile`: fallback profile for direct commands and aliases.
- `profiles`: named provider/model/thinking presets.
- `profiles.router.models`: exact model cycling list.
- `aliases`: command presets with profile, extra args, and optional prompt.
- `providerKeys`: env var names checked by provider, values never printed.

Use `MY_PI_CONFIG_PATH=./other-config.json my-pi ...` to test another config.

Invalid config fails before `pi` starts.

## Doctor

`my-pi doctor` prints concise checks:

- Node version >= 22.19
- `pi --version`
- tmux `extended-keys` when inside tmux
- settings file exists
- session directory is writable
- provider keys present/missing, without values

Required check failure exits non-zero. Missing provider keys are warnings.

## Extensions

- `pure-focus`: hides header, footer, working row, and status labels.
- Set `quietStartup: true` in settings to hide loaded resource lists too.

Example:

- `my-pi router -e extensions/pure-focus.ts "focus"`

### Wrapper knobs

- `MY_PI_SETTINGS_PATH`: path to a custom settings file (defaults to `~/.pi/agent/settings.json`).
- `MY_PI_CONFIG_PATH`: path to a custom wrapper config.
- `MY_PI_BANNER`: custom banner text (set to `0` to disable).
- `MY_PI_NO_PROMPT=1`: disable `prompts/system-prompt.md` and task prompt appends.
- Logs: minimal startup logs are written to `<config-dir>/my-pi/logs/pi-YYYY-MM-DD.log`.
- Sessions: `my-pi` stores sessions in `~/.pi/my-pi/sessions`.

Examples:

- `MY_PI_SETTINGS_PATH=./profiles/dev.json npm run my-pi`
- `MY_PI_BANNER=my-ops-pi npm run my-pi`
- `MY_PI_NO_PROMPT=1 my-pi ask "raw upstream behavior"`

## Versioning

This repo uses Git + GitHub. Commits should follow conventional commits and branch names `type/description`.
