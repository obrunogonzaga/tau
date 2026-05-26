import type {
  ContextUsage,
  ExtensionAPI,
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'

const formatContext = (usage: ContextUsage | undefined) => {
  if (!usage) return 'ctx ?'
  if (usage.percent === null) return `ctx ?/${usage.contextWindow}`

  return `ctx ${usage.percent.toFixed(0)}%`
}

const formatModel = (ctx: ExtensionContext) => {
  if (!ctx.model) return 'model ?'

  return `${ctx.model.provider}/${ctx.model.id}`
}

class StatusFooter implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
    private readonly footerData: ReadonlyFooterDataProvider,
  ) {}

  render(): string[] {
    const branch = this.footerData.getGitBranch()
    const parts = ['tau', formatModel(this.ctx), formatContext(this.ctx.getContextUsage())]
    if (branch) parts.push(`git ${branch}`)

    return [this.theme.fg('dim', parts.join(' | '))]
  }

  invalidate(): void {}
}

export default function statusFooter(pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    ctx.ui.setFooter((_tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => {
      return new StatusFooter(ctx, theme, footerData)
    })
  })
}
