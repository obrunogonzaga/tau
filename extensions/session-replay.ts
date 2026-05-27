import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { AgentMessage } from '@earendil-works/pi-agent-core'

type ReplayItem = {
  body: string
  title: string
}

const REPLAY_KEY = 'tau-replay-tool-call'
const SENSITIVE_KEY = /(token|secret|password|auth|credential|api[_-]?key|access[_-]?token|bearer)/i
const LEAKY_PATTERN = /(sk\-|pk_live_|ghp_|gho_)[A-Za-z0-9_+-]{16,}/

const redactValue = (value: unknown, key = ''): unknown => {
  if (typeof value === 'string') {
    if (SENSITIVE_KEY.test(key) || LEAKY_PATTERN.test(value)) return '[redacted]'
    return value
  }

  if (Array.isArray(value)) return value.map((entry) => redactValue(entry))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      out[entryKey] = SENSITIVE_KEY.test(entryKey) ? '[redacted]' : redactValue(entryValue, entryKey)
    }
    return out
  }

  return value
}

const textFromContent = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return JSON.stringify(content)

  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (part && typeof part === 'object' && 'type' in part && part.type === 'thinking') return ''
      if (part && typeof part === 'object' && 'text' in part) return String(part.text)
      if (part && typeof part === 'object' && 'name' in part) return `tool ${String(part.name)}`
      return JSON.stringify(part)
    })
    .filter(Boolean)
    .join(' ')
}

const messageItem = (message: AgentMessage): ReplayItem | null => {
  if (message.role === 'user') {
    return { title: 'prompt', body: textFromContent(message.content) }
  }
  if (message.role === 'assistant') {
    return { title: 'assistant', body: textFromContent(message.content) }
  }

  return null
}

const entryItem = (entry: ReturnType<ExtensionAPI['appendEntry']> | any): ReplayItem | null => {
  if (entry.type === 'message') return messageItem(entry.message)
  if (entry.type === 'custom' && entry.customType === REPLAY_KEY) {
    const safeArgs = redactValue(entry.data.args ?? {})
    return { title: 'tool', body: `${entry.data.toolName} ${JSON.stringify(safeArgs)}` }
  }
  if (entry.type === 'custom_message') return { title: entry.customType, body: textFromContent(entry.content) }

  return null
}

const buildTimeline = (entries: any[]) => entries.map(entryItem).filter(Boolean) as ReplayItem[]

const renderTimeline = (timeline: ReplayItem[], index: number, all: boolean) => {
  if (timeline.length === 0) return 'replay empty'
  if (all) return timeline.map((item, i) => `${i + 1}. ${item.title}\n${item.body}`).join('\n\n')

  const item = timeline[index] ?? timeline[0]
  return `${index + 1}/${timeline.length} ${item.title}\n${item.body}`
}

export default function sessionReplay(pi: ExtensionAPI) {
  let cursor = 0

  pi.on('tool_execution_start', (event) => {
    pi.appendEntry(REPLAY_KEY, {
      args: redactValue(event.args),
      toolCallId: event.toolCallId,
      toolName: event.toolName,
    })
  })

  pi.registerCommand('replay', {
    description: 'Show current session timeline',
    handler: async (args, ctx) => {
      const action = args.trim() || 'current'
      const timeline = buildTimeline(ctx.sessionManager.getBranch())
      if (action === 'next') cursor = Math.min(cursor + 1, Math.max(0, timeline.length - 1))
      if (action === 'prev') cursor = Math.max(0, cursor - 1)
      if (action === 'all') cursor = 0

      const output = renderTimeline(timeline, cursor, action === 'all')
      ctx.ui.notify(output)
    },
  })
}
