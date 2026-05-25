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

## Versioning

This repo uses Git + GitHub. Commits should follow conventional commits and branch names `type/description`.

