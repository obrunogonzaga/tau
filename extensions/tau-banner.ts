import type { ExtensionAPI, Theme } from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'

const BANNER = [
  '████████╗ █████╗ ██╗   ██╗',
  '╚══██╔══╝██╔══██╗██║   ██║',
  '   ██║   ███████║██║   ██║',
  '   ██║   ██╔══██║██║   ██║',
  '   ██║   ██║  ██║╚██████╔╝',
  '   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ',
]

class TauBanner implements Component {
  constructor(private readonly theme: Theme) {}

  render(): string[] {
    return [
      ...BANNER.map((line) => this.theme.fg('accent', line)),
      this.theme.fg('dim', 'escape interrupt · ctrl+c/ctrl+d clear/exit · / commands · ! bash · ctrl+o more'),
      this.theme.fg('dim', 'inspect real state · edit narrowly · test · report results'),
      '',
    ]
  }

  invalidate(): void {}
}

export default function tauBanner(pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    ctx.ui.setHeader((_tui: TUI, theme: Theme) => new TauBanner(theme))
    ctx.ui.setTitle('tau')
  })
}
