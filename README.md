# my-pi-version

This repo stores my customized version of `pi` CLI (configs, extensions, prompts, scripts).

## What is inside

- `extensions/`  place for local extensions
- `prompts/`     shared prompt templates
- `scripts/`     helper scripts
- `agent-settings.example.json` template for ~/.pi/agent/settings.json
- `bin/my-pi.js` thin wrapper to run current installed pi

## Quick start

1. Install dependencies from upstream if you haven't already:
   - `npm i -g @earendil-works/pi-coding-agent`
2. Start pi:
   - `npm run pi`
3. Start with wrapper:
   - `npm run my-pi`
4. Start with fast profile:
   - `my-pi fast "summarize this repo"`
5. Start with work profile:
   - `my-pi work "implement this"`
6. Start with deep profile:
   - `my-pi deep "debug this hard bug"`

## Profiles

A profile is a named preset that expands to pi flags.

- `fast`: `--provider openai-codex --model gpt-5.3-codex-spark --thinking low`
- `work`: `--provider github-copilot --model gpt-5.5 --thinking medium`
- `deep`: `--provider openai --model gpt-5.5 --thinking xhigh`

### Wrapper knobs

- `MY_PI_SETTINGS_PATH`: path to a custom settings file (defaults to `~/.pi/agent/settings.json`).
- `MY_PI_BANNER`: custom banner text (set to `0` to disable).
- Logs: minimal startup logs are written to `<config-dir>/my-pi/logs/pi-YYYY-MM-DD.log`.
- Sessions: `my-pi` stores sessions in `~/.pi/my-pi/sessions`.

Examples:

- `MY_PI_SETTINGS_PATH=./profiles/dev.json npm run my-pi`
- `MY_PI_BANNER=my-ops-pi npm run my-pi`

## Versioning

This repo uses Git + GitHub. Commits should follow conventional commits and branch names `type/description`.
