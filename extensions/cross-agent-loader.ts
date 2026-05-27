import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

type Discovery = {
  kind: string
  source: string
  title: string
}

const AGENT_DIRS = ['.claude', '.gemini', '.codex', '.pi']
const SECRET_FILE_PATTERN = /(^|\/)(\.env|auth|token|secret|credentials|key|history|sessions?|logs?|cache)(\.|\/|$)/i
const SAFE_EXTENSIONS = new Set(['.md', '.markdown', '.yaml', '.yml', '.json'])
const BLOCKED_DIRS = ['/node_modules/', '/.git/', '/.ssh/', '/.cache/', '/Library/', '/AppData/']

const uniqueRoots = (cwd: string) => [...new Set([cwd, os.homedir()])]

const isSafeFile = (filePath: string) => {
  if (SECRET_FILE_PATTERN.test(filePath)) return false
  if (BLOCKED_DIRS.some((segment) => filePath.includes(segment))) return false

  return SAFE_EXTENSIONS.has(path.extname(filePath))
}

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
    if (BLOCKED_DIRS.some((segment) => fullPath.includes(segment))) continue
    if (SECRET_FILE_PATTERN.test(fullPath)) continue

    if (entry.isDirectory()) found.push(...walk(fullPath, limit - found.length, depth - 1))
    if (entry.isFile() && isSafeFile(fullPath)) found.push(fullPath)
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

const render = (items: Discovery[]) => {
  if (items.length === 0) return 'xload none'

  return items
    .sort((left, right) => `${left.kind}:${left.title}`.localeCompare(`${right.kind}:${right.title}`))
    .map((item) => `${item.kind} ${item.title} ${item.source}`)
    .join('\n')
}

export default function crossAgentLoader(pi: ExtensionAPI) {
  pi.registerCommand('xload', {
    description: 'List safe cross-agent commands, agents, skills, and assets',
    handler: async (args, ctx) => {
      const filter = args.trim().toLowerCase()
      const items = discover(ctx.cwd).filter(
        (item) =>
          !filter || item.kind === filter || item.title.toLowerCase().includes(filter),
      )
      const output = render(items)

      pi.appendEntry('tau-cross-agent-loader', { count: items.length, items })
      ctx.ui.notify(output)
      ctx.ui.setWidget('tau-cross-agent-loader', output.split('\n'), { placement: 'belowEditor' })
    },
  })
}
