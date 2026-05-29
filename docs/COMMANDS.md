# Tau Commands

This is the operational command reference for Tau.

## Wrapper

| Command | Description |
| --- | --- |
| `tau` | Start default Tau session with banner. |
| `tau doctor` | Run local health checks. |
| `tau --profile fast "task"` | Start direct task with explicit profile. |
| `tau --profile=router "task"` | Same, equals syntax. |
| `TAU_NO_PROMPT=1 tau ...` | Disable Tau system prompt and task prompts. |
| `TAU_SKIP_AUTH_CHECK=1 tau ...` | Skip wrapper auth preflight. |

## Profiles

| Command | Description |
| --- | --- |
| `tau fast "task"` | OpenAI Codex spark, low thinking. |
| `tau work "task"` | GitHub Copilot, medium thinking. |
| `tau deep "task"` | OpenAI Codex, xhigh thinking. |
| `tau router "task"` | Fast default plus model cycling list. |

## Task Aliases

| Command | Description |
| --- | --- |
| `tau ask "question"` | Print-mode answer. |
| `tau code "task"` | Default fast coding session. |
| `tau review "diff"` | Read-only review with `read,grep,find,ls`. |
| `tau plan "scope"` | Read-only planning with planning prompt. |
| `tau grill "plan"` | Deep critique with read-only tools. |
| `tau fix "bug"` | Narrow fix prompt. |
| `tau commit "diff"` | Commit guidance with read/bash tools. |
| `tau pr "branch"` | PR guidance with read/bash tools. |
| `tau debug "failure"` | Deep investigation with read/search/list/bash. |
| `tau ship "task"` | Explicit implementation mode. |

Profile override works only at the start or immediately after an alias:

```bash
tau review --profile deep "review current diff"
tau ship --profile router "ship with model cycling"
tau ship --profile=work "force Copilot"
```

## Session Aliases

| Command | Description |
| --- | --- |
| `tau continue "prompt"` | Continue latest session. |
| `tau resume` | Choose or resume existing session. |
| `tau resume "prompt"` | Resume with extra prompt. |
| `tau fork session-123` | Fork from session id. |
| `tau fork session-123 "prompt"` | Fork with extra prompt. |
| `tau export session-123` | Export session. |
| `tau export session-123 session.html` | Export session to path. |

## Extension Presets

| Command | Description |
| --- | --- |
| `tau ext banner` | Banner only. |
| `tau ext minimal "task"` | Banner + status footer. |
| `tau ext focus "task"` | Purpose gate + task discipline + pure focus. |
| `tau ext safe "task"` | Purpose/task discipline + damage control. |
| `tau ext damage "task"` | Damage control only stack. |
| `tau ext damage-continue "task"` | Damage control with safe continuation prompt. |
| `tau ext team "task"` | Persona selector stack. |
| `tau ext chain "task"` | Chain/persona stack. |
| `tau ext vibe "task"` | Banner + theme cycler + status/tool footers. |
| `tau ext orchestrate "task"` | Subagents + replay + cross-agent loader. |

NPM shortcuts:

```bash
npm run ext:banner
npm run ext:minimal
npm run ext:focus
npm run ext:vibe
npm run ext:orchestrate
npm run ext:safe
npm run ext:team
npm run ext:chain
npm run ext:smoke
```

## In-Session Commands

### Themes

| Command | Description |
| --- | --- |
| `/theme` | List available themes. |
| `/theme <name>` | Switch to a theme by name. |
| `/theme tau-dark` | Daily Tau dark theme. |
| `/theme tau-focus` | Lower-distraction Tau theme. |
| `/theme tau-alert` | Strong contrast for safety/debug work. |

Theme shortcuts:

- `Ctrl+Shift+T`: next theme.
- `Ctrl+Alt+T`: previous theme.

### Personas

| Command | Description |
| --- | --- |
| `/system list` | List local personas. |
| `/system scout` | Select scout persona. |
| `/system planner` | Select planner persona. |
| `/system builder` | Select builder persona. |
| `/system reviewer` | Select reviewer persona. |

### Purpose And Tasks

| Command | Description |
| --- | --- |
| `/purpose finish M8` | Set session purpose. |
| `/task add implement purpose gate` | Add task. |
| `/task start 1` | Mark task in progress. |
| `/task done 1` | Mark task done. |
| `/task set 1 pending` | Set task status. |
| `/task list` | Show task list. |

### Subagents

| Command | Description |
| --- | --- |
| `/sub inspect docs for missing examples` | Start background subagent with limited tools. |
| `/sub list` | List subagents with status, elapsed time, prompt preview. |
| `/sub show 1` | Show full prompt, status, summary, result preview, recent events. |
| `/sub open 1` | Open details if Pi supports it; otherwise show audit fallback. |

Subagent status values:

- `running`
- `done`
- `error`
- `cancelled` when supported by runtime/future API

Timeline captures:

- start
- prompt
- assistant messages
- tool calls
- completion
- errors

Thinking blobs are filtered. Long event entries are truncated with `[truncated]`.

### Replay

| Command | Description |
| --- | --- |
| `/replay` | Show current timeline item. |
| `/replay next` | Move forward. |
| `/replay prev` | Move back. |
| `/replay all` | Show timeline output. |

### Cross-Agent Loader

| Command | Description |
| --- | --- |
| `/xload` | List safe `.claude`, `.gemini`, `.codex`, and `.pi` assets. |
| `/xload agent` | Filter agents. |
| `/xload command` | Filter commands. |
| `/xload skill` | Filter skills. |
| `/xload more` | Show next page. |

## Maintenance

| Command | Description |
| --- | --- |
| `npm test` | Run Node tests. |
| `tau doctor` | Verify local runtime. |
| `npx changeset` | Add release note. |
| `npx changeset status` | Show pending version bumps. |
| `npx changeset version` | Apply pending changesets. |
| `npx changeset publish` | Publish package; do not run while package is private. |
