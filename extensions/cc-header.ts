import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExtensionAPI, ExtensionContext, Theme } from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'
import { visibleWidth } from '@earendil-works/pi-tui'
import { type Brand, resolveBrand } from './lib/cc-brand.ts'
import { fit, formatCwd, formatModel } from './lib/cc-format.ts'

const MAX_WIDTH = 110
const TWO_COL_MIN = 72
const PLAIN_MIN = 28

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const readVersion = () => {
  try {
    return JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).version as string
  } catch {
    return ''
  }
}

const shortenName = (name: string) => name.split(' ').slice(0, 2).join(' ')

class CcHeader implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
    private readonly brand: Brand,
    private readonly name: string,
    private readonly version: string,
  ) {}

  render(width: number): string[] {
    const boxWidth = Math.min(width, MAX_WIDTH)
    if (boxWidth < PLAIN_MIN) return this.renderPlain()
    if (boxWidth < TWO_COL_MIN) return this.renderSingle(boxWidth)
    return this.renderTwoColumn(boxWidth)
  }

  private renderTwoColumn(boxWidth: number): string[] {
    const t = this.theme
    const border = (text: string) => t.fg('border', text)
    const contentWidth = boxWidth - 7
    const leftW = Math.min(44, Math.floor(contentWidth * 0.42))
    const rightW = contentWidth - leftW

    const left = this.leftColumn()
    const right = this.rightColumn(rightW)
    const rows = Math.max(left.length, right.length)

    const row = (l: string, r: string) =>
      `${border('│')} ${fit(l, leftW, 'center')} ${border('│')} ${fit(r, rightW, 'left')} ${border('│')}`

    const body = Array.from({ length: rows }, (_, i) => row(left[i] ?? '', right[i] ?? ''))
    return [this.topBorder(boxWidth), ...body, this.bottomBorder(boxWidth), '', this.tagline(), '']
  }

  private leftColumn(): string[] {
    const t = this.theme
    return [
      '',
      t.bold(t.fg('toolTitle', `${this.brand.greeting} ${this.name}!`)),
      '',
      ...this.brand.mascot.map((line) => t.fg('accent', line)),
      '',
      t.fg('muted', formatModel(this.ctx, 'model pending')),
      t.fg('dim', formatCwd(this.ctx.cwd)),
      '',
    ]
  }

  private rightColumn(width: number): string[] {
    const t = this.theme
    const [whatsNewLead, ...whatsNewRest] = this.brand.whatsNew
    return [
      '',
      t.bold(t.fg('accent', 'Tips for getting started')),
      ...this.brand.tips.map((tip) => t.fg('text', tip)),
      '',
      t.fg('dim', '─'.repeat(Math.max(0, width))),
      t.bold(t.fg('accent', "What's new")),
      t.fg('text', whatsNewLead ?? ''),
      ...whatsNewRest.slice(0, -1).map((line) => t.fg('text', line)),
      t.fg('dim', whatsNewRest.length > 0 ? whatsNewRest[whatsNewRest.length - 1] : ''),
    ]
  }

  private renderSingle(boxWidth: number): string[] {
    const t = this.theme
    const border = (text: string) => t.fg('border', text)
    const inner = boxWidth - 2
    const row = (content: string) => `${border('│')} ${fit(content, inner - 2, 'left')} ${border('│')}`

    const rows = [
      '',
      t.bold(t.fg('toolTitle', `${this.brand.greeting} ${this.name}!`)),
      t.fg('muted', formatModel(this.ctx, 'model pending')),
      t.fg('dim', formatCwd(this.ctx.cwd)),
      '',
      t.fg('dim', this.brand.tips[1]),
      '',
    ]
    return [this.topBorder(boxWidth), ...rows.map(row), this.bottomBorder(boxWidth), '']
  }

  private topBorder(boxWidth: number): string {
    const t = this.theme
    const title = this.brand.showVersion && this.version ? `${this.brand.title} v${this.version}` : this.brand.title
    const fill = Math.max(0, boxWidth - 2 - 3 - visibleWidth(title))
    return t.fg('border', '╭─ ') + t.fg('accent', title) + t.fg('border', ` ${'─'.repeat(fill)}╮`)
  }

  private bottomBorder(boxWidth: number): string {
    return this.theme.fg('border', `╰${'─'.repeat(boxWidth - 2)}╯`)
  }

  private tagline(): string {
    return this.theme.fg('dim', this.brand.tagline)
  }

  private renderPlain(): string[] {
    const t = this.theme
    return [
      t.bold(t.fg('toolTitle', `${this.brand.greeting} ${this.name}!`)),
      t.fg('dim', formatCwd(this.ctx.cwd)),
      '',
    ]
  }

  invalidate(): void {}
}

export default function ccHeader(pi: ExtensionAPI) {
  const version = readVersion()

  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    const brand = resolveBrand()
    let name = process.env.USER ?? 'there'
    const applyHeader = () =>
      ctx.ui.setHeader((_tui: TUI, theme: Theme) => new CcHeader(ctx, theme, brand, name, version))

    if (ctx.ui.theme.name !== brand.themeName) ctx.ui.setTheme(brand.themeName)
    applyHeader()
    ctx.ui.setTitle(brand.title)

    pi.exec('git', ['config', 'user.name'], { cwd: ctx.cwd, timeout: 2000 })
      .then((result) => {
        const gitName = result.stdout.trim()
        if (gitName) {
          name = shortenName(gitName)
          applyHeader()
        }
      })
      .catch(() => {})
  })
}
