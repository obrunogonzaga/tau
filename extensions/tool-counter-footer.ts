import type {
  ContextUsage,
  ExtensionAPI,
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'

const formatShortPath = (cwd: string) => cwd.replace(process.env.HOME ?? '', '~')

const formatContext = (usage: ContextUsage | undefined) => {
  if (!usage || usage.tokens === null) return 'ctx ?'

  return `ctx ${usage.tokens}/${usage.contextWindow}`
}

const formatCost = (ctx: ExtensionContext) => {
  const stats = (ctx as unknown as { getSessionStats?: () => { cost?: number } }).getSessionStats?.()
  if (typeof stats?.cost === 'number') return `$${stats.cost.toFixed(4)}`

  return '$?'
}

const formatTools = (toolCounts: Map<string, number>) => {
  if (toolCounts.size === 0) return 'tools 0'

  return [...toolCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name}:${count}`)
    .join(' ')
}

const formatStatuses = (footerData: ReadonlyFooterDataProvider) =>
  [...footerData.getExtensionStatuses().values()].map((status) => status.replace(/\s+/g, ' ').trim())

class ToolCounterFooter implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
    private readonly footerData: ReadonlyFooterDataProvider,
    private readonly toolCounts: Map<string, number>,
  ) {}

  render(): string[] {
    const branch = this.footerData.getGitBranch() ?? '-'
    const model = this.ctx.model ? `${this.ctx.model.provider}/${this.ctx.model.id}` : 'model ?'
    const parts = [
      formatShortPath(this.ctx.cwd),
      `git ${branch}`,
      model,
      formatContext(this.ctx.getContextUsage()),
      formatCost(this.ctx),
      formatTools(this.toolCounts),
      ...formatStatuses(this.footerData),
    ]

    return [this.theme.fg('dim', parts.join(' | '))]
  }

  invalidate(): void {}
}

export default function toolCounterFooter(pi: ExtensionAPI) {
  const toolCounts = new Map<string, number>()

  pi.on('tool_call', (event) => {
    toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1)
  })

  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    ctx.ui.setFooter((_tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => {
      return new ToolCounterFooter(ctx, theme, footerData, toolCounts)
    })
  })
}
