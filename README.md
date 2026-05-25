# my-pi-version

This repo stores my customized `pi` CLI layer: router, prompts, configs, extensions, scripts.

## What is inside

- `extensions/`  place for local extensions
- `prompts/`     shared prompt templates
- `scripts/`     helper scripts
- `agent-settings.example.json` template for ~/.pi/agent/settings.json
- `bin/my-pi.js` wrapper/router to run current installed pi

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
- `deep`: `--provider openai-codex --model gpt-5.5 --thinking xhigh`

## Aliases

- `ask`: `-p`
- `code`: same as `work`
- `review`: same as `work`, plus `--tools read,grep,find,ls,bash -p`
- `plan`: same as `work`, plus read tools, print mode, planning prompt
- `grill`: same as `deep`, plus read tools, print mode, critique prompt
- `fix`: same as `work`, plus focused fix prompt
- `commit`: same as `work`, plus read/bash tools, print mode, commit prompt
- `pr`: same as `work`, plus read/bash tools, print mode, PR prompt
- `debug`: same as `deep`, plus read/bash tools, print mode, debug prompt

Examples:

- `my-pi ask "what is this repo?"`
- `my-pi code "implement this"`
- `my-pi review "review current changes"`
- `my-pi plan "split M2 into phases"`
- `my-pi grill "attack this architecture"`
- `my-pi fix "repair failing tests"`
- `my-pi commit "prepare commit for current diff"`
- `my-pi pr "draft PR for current branch"`
- `my-pi debug "reproduce failing npm test"`

Aliases can use a profile override:

- `my-pi review --profile deep "review diff"`
- `my-pi plan --profile fast "quick plan"`
- `my-pi --profile fast "quick task"`

`--profile` is only parsed at the start or right after an alias.

### Wrapper knobs

- `MY_PI_SETTINGS_PATH`: path to a custom settings file (defaults to `~/.pi/agent/settings.json`).
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
