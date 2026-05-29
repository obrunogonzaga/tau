import type { ExtensionAPI, ExtensionContext, Theme } from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'
import { visibleWidth } from '@earendil-works/pi-tui'

const MAX_WIDTH = 64
const MIN_WIDTH = 28
const CC_THEME = 'tau-cc'

const formatCwd = (cwd: string) => {
  const home = process.env.HOME
  return home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd
}

const formatModel = (ctx: ExtensionContext) =>
  ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : 'model pending'

const padTo = (text: string, width: number) =>
  text + ' '.repeat(Math.max(0, width - visibleWidth(text)))

class CcHeader implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
  ) {}

  render(width: number): string[] {
    const boxWidth = Math.min(width, MAX_WIDTH)
    if (boxWidth < MIN_WIDTH) return this.renderPlain()

    const inner = boxWidth - 2
    const border = (text: string) => this.theme.fg('border', text)
    const row = (content: string) => border('│') + padTo(` ${content}`, inner) + border('│')

    const rows = [
      '',
      `${this.theme.fg('dim', padTo('cwd', 6))}${this.theme.fg('text', formatCwd(this.ctx.cwd))}`,
      `${this.theme.fg('dim', padTo('model', 6))}${this.theme.fg('text', formatModel(this.ctx))}`,
      '',
      this.theme.fg('dim', '/help · ! bash · ctrl+o tools · esc to interrupt'),
    ]

    return [this.renderTop(boxWidth, border), ...rows.map(row), this.renderBottom(inner, border), '']
  }

  private renderTop(boxWidth: number, border: (text: string) => string): string {
    const title = `${this.theme.fg('accent', '✻')} ${this.theme.fg('toolTitle', 'Welcome to Tau')}`
    const titleWidth = visibleWidth('✻ Welcome to Tau')
    const fill = Math.max(0, boxWidth - 2 - 3 - titleWidth)
    return border(`╭─ `) + title + border(` ${'─'.repeat(fill)}╮`)
  }

  private renderBottom(inner: number, border: (text: string) => string): string {
    return border(`╰${'─'.repeat(inner)}╯`)
  }

  private renderPlain(): string[] {
    return [
      `${this.theme.fg('accent', '✻')} ${this.theme.fg('toolTitle', 'Welcome to Tau')}`,
      this.theme.fg('dim', formatCwd(this.ctx.cwd)),
      '',
    ]
  }

  invalidate(): void {}
}

export default function ccHeader(pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    if (ctx.ui.theme.name !== CC_THEME) ctx.ui.setTheme(CC_THEME)
    ctx.ui.setHeader((_tui: TUI, theme: Theme) => new CcHeader(ctx, theme))
    ctx.ui.setTitle('tau')
  })
}
