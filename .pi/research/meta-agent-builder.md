# Meta-agent builder

## First meta-agent scope

Generate draft Pi assets only: extensions, prompts, configs, themes, skills, and agent personas. Do not auto-activate generated assets.

## Experts

- extension expert: Pi extension APIs and event lifecycle.
- config expert: Tau config and wrapper argv behavior.
- prompt expert: concise operational prompts.
- skill expert: reusable workflow docs.
- theme expert: TUI theme compatibility.

## Docs lookup

Before generation, inspect current local Pi examples and type definitions. For external libraries, use current official docs before writing code.

## Smoke checks

Extensions need at least source-level tests and a launch preset when useful. Config changes need exact argv tests. Prompts and skills need path/existence checks plus README references.

## Review before activation

Generated assets land in a draft path first. A human or reviewer persona checks scope, secrets, command surface, and tests before the asset is moved into an active preset.
