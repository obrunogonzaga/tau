# AGENTES.md

## Style

- Be concise.
- Prefer direct actions over long explanations.
- Use conventional commits.
- Keep commits one phrase.

## Repo

- This repo customizes the local `pi` CLI through `tau`.
- Main entrypoint: `bin/tau.js`.
- Global command is provided by `package.json` `bin.tau`.
- Sessions are isolated under `~/.pi/tau/sessions`.
- Tests use Node built-in test runner.

## Commands

```bash
npm test
npm run tau
tau fast "summarize this repo"
```

## Rules

- Do not commit secrets.
- Keep wrapper changes small and tested.
- Update `CHANGELOG.md` for behavior changes.
- Update `README.md` when commands or profiles change.
- If adding release tooling, configure Changesets before using `npx changeset`.

## Profiles

- `fast`: quick coding profile.
- `work`: daily coding profile.
- `deep`: hard debugging and design profile.
- `ask`: quick print alias.
- `code`: daily coding alias.
- `review`: read-only print review alias.
- Prefer adding profiles through a single profile map.
- Add or update tests for each profile or alias.
- Support `--profile` overrides when alias behavior needs another model.
