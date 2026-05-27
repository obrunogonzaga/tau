# Agents

Specialist agent prompts live here.

- `scout`: repo exploration, no-edit.
- `planner`: plan only, no-edit.
- `plan-reviewer`: challenge plans.
- `builder`: implementation.
- `reviewer`: code review.
- `documenter`: docs.
- `red-team`: security and failure modes.

Teams: `teams.yaml`.

Chains: `agent-chain.yaml`.

Chain templates use `$INPUT` for current input and `$ORIGINAL` for the starting request.
