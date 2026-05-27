# Pi-to-Pi communication

Decision: local-only first.

## Security model

Start with same-machine message passing only. Treat every peer as untrusted until explicitly launched by the local user from the current repo. No automatic network listener, no open port, no remote execution by default.

## Auth/token handling

Use inherited local Pi auth only inside each launched process. Do not copy provider tokens between peers. If network mode is later approved, use short-lived bearer tokens from the OS keychain or an explicit env var, never session files.

## Minimal workflow

1. Main Tau session starts a subagent with limited tools.
2. Subagent runs in an in-memory or isolated session.
3. Subagent returns a text summary to the main session.
4. Main session decides whether to act on it.

Networked mode stays research-only until there is a concrete Hermes/laptop workflow and a reviewed auth story.
