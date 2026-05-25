#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$HOME/.pi/agent"
cp "$(cd "$(dirname "$0")/.." && pwd)/agent-settings.example.json" "$HOME/.pi/agent/settings.json"

echo "pi settings synced from agent-settings.example.json"
