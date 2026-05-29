import type {
  ContextUsage,
  ExtensionAPI,
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'
import { formatCost, formatCwd, formatModel, formatStatuses, formatTools } from './lib/cc-format.ts'

const formatContext = (usage: ContextUsage | undefined) => {
  if (!usage || usage.tokens === null) return 'ctx ?'

  return `ctx ${usage.tokens}/${usage.contextWindow}`
}

class ToolCounterFooter implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
    private readonly footerData: ReadonlyFooterDataProvider,
    private readonly toolCounts: Map<string, number>,
  ) {}

  render(): string[] {
    const branch = this.footerData.getGitBranch() ?? '-'
    const parts = [
      formatCwd(this.ctx.cwd),
      `git ${branch}`,
      formatModel(this.ctx, 'model ?'),
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
