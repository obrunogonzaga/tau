import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { isBlockedPath, isSafeCrossAgentFile, isSensitivePath } from './lib/safety.js'

type Discovery = {
  kind: string
  source: string
  title: string
}

const AGENT_DIRS = ['.claude', '.gemini', '.codex', '.pi']
const DEFAULT_LIMIT = 20

const uniqueRoots = (cwd: string) => [...new Set([cwd, os.homedir()])]

const kindForPath = (filePath: string) => {
  if (filePath.includes('/commands/')) return 'command'
  if (filePath.includes('/agents/') || filePath.endsWith('/AGENTS.md')) return 'agent'
  if (filePath.includes('/skills/') || filePath.endsWith('/SKILL.md')) return 'skill'
  return 'asset'
}

const titleForPath = (filePath: string) => path.basename(filePath, path.extname(filePath))

const walk = (dir: string, limit = 120, depth = 8): string[] => {
  if (!fs.existsSync(dir) || limit <= 0 || depth <= 0) return []

  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (isBlockedPath(fullPath)) continue
    if (isSensitivePath(fullPath)) continue

    if (entry.isDirectory()) found.push(...walk(fullPath, limit - found.length, depth - 1))
    if (entry.isFile() && isSafeCrossAgentFile(fullPath)) found.push(fullPath)
    if (found.length >= limit) break
  }

  return found
}

const discover = (cwd: string): Discovery[] =>
  uniqueRoots(cwd).flatMap((root) =>
    AGENT_DIRS.flatMap((dir) =>
      walk(path.join(root, dir)).map((filePath) => ({
        kind: kindForPath(filePath),
        source: filePath,
        title: titleForPath(filePath),
      })),
    ),
  )

const summarizeKindCounts = (items: Discovery[]) => {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([kind, value]) => `${kind}:${value}`)
    .sort()
    .join(' ')
}

const renderSlice = (items: Discovery[], start: number, limit: number) => {
  if (items.length === 0) return 'xload none'

  const ordered = [...items].sort((left, right) => `${left.kind}:${left.title}`.localeCompare(`${right.kind}:${right.title}`))
  const page = ordered.slice(start, start + limit)
  const lines = [
    `xload ${items.length} items`,
    `kinds: ${summarizeKindCounts(items)}`,
    `showing ${start + 1}-${start + page.length} ${items.length > limit ? '(use /xload more)' : ''}`,
  ].filter(Boolean)

  for (const item of page) {
    const index = ordered.indexOf(item) + 1
    lines.push(`${index}. [${item.kind}] ${item.title}`)
    lines.push(`   ${item.source}`)
  }

  return lines.join('\n')
}

export default function crossAgentLoader(pi: ExtensionAPI) {
  let offset = 0

  pi.registerCommand('xload', {
    description: 'List safe cross-agent commands, agents, skills, and assets',
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase()
      const isMore = action === 'more'
      const filter = isMore ? '' : action
      const items = discover(ctx.cwd)
        .filter((item) => !filter || item.kind === filter || item.title.toLowerCase().includes(filter))

      if (!isMore) offset = 0
      else if (offset + DEFAULT_LIMIT < items.length) offset += DEFAULT_LIMIT

      const output = renderSlice(items, offset, DEFAULT_LIMIT)
      pi.appendEntry('tau-cross-agent-loader', { count: items.length, items })
      ctx.ui.notify(output)
    },
  })
}
