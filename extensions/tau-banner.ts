import type { ExtensionAPI, ExtensionContext, Theme } from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'
import { resolveBrand } from './lib/cc-brand.ts'

const formatMode = (ctx: ExtensionContext) => {
  const label = resolveBrand().bannerLabel
  if (!ctx.model) return `${label} :: model pending`

  return `${label} :: ${ctx.model.provider}/${ctx.model.id}`
}

class TauBanner implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
  ) {}

  render(): string[] {
    return [
      this.theme.fg('accent', formatMode(this.ctx)),
      this.theme.fg('dim', 'inspect first | edit narrow | test | report'),
      this.theme.fg('dim', '/ commands | ! bash | ctrl+o tools | ctrl+c stop'),
      '',
    ]
  }

  invalidate(): void {}
}

export default function tauBanner(pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    ctx.ui.setHeader((_tui: TUI, theme: Theme) => new TauBanner(ctx, theme))
    ctx.ui.setTitle(resolveBrand().title)
  })
}
