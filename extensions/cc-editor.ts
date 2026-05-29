import {
  CustomEditor,
  type ExtensionAPI,
  type ExtensionContext,
  type KeybindingsManager,
  type ReadonlyFooterDataProvider,
} from '@earendil-works/pi-coding-agent'
import type { Component, EditorTheme, Focusable, Theme, TUI } from '@earendil-works/pi-tui'
import { visibleWidth } from '@earendil-works/pi-tui'
import { fitRounded, formatContextPercent, formatCost, formatCwd, formatModel, formatTools } from './lib/cc-format.ts'

const SHORTCUTS: Array<[string, string]> = [
  ['enter', 'submit'],
  ['shift+enter', 'new line'],
  ['/', 'commands'],
  ['!', 'bash mode'],
  ['ctrl+o', 'tools'],
  ['ctrl+e', 'expand tool output'],
  ['ctrl+p', 'switch model'],
  ['ctrl+shift+t', 'next theme'],
  ['ctrl+alt+t', 'previous theme'],
  ['esc', 'interrupt'],
  ['ctrl+c', 'stop'],
  ['?', 'this help'],
]

const HINT = '? for shortcuts · / commands · ! bash'

class CcFooter implements Component {
  constructor(
    private readonly ctx: ExtensionContext,
    private readonly theme: Theme,
    private readonly footerData: ReadonlyFooterDataProvider,
    private readonly toolCounts: ReadonlyMap<string, number>,
  ) {}

  render(): string[] {
    const t = this.theme
    const branch = this.footerData.getGitBranch()
    const parts = [formatTools(this.toolCounts), formatCost(this.ctx)]
    if (branch) parts.unshift(`git ${branch}`)

    return [t.fg('dim', `  ${parts.join(' · ')}`), t.fg('dim', `  ${HINT}`)]
  }

  invalidate(): void {}
}

class ShortcutsOverlay implements Component, Focusable {
  readonly width = 44
  focused = false

  constructor(
    private readonly theme: Theme,
    private readonly done: (result: string) => void,
  ) {}

  handleInput(data: string): void {
    this.done(data)
  }

  render(): string[] {
    const inner = this.width - 2
    const keyWidth = Math.max(...SHORTCUTS.map(([key]) => key.length))
    const border = (text: string) => this.theme.fg('border', text)
    const pad = (text: string) => text + ' '.repeat(Math.max(0, inner - visibleWidth(text)))
    const row = (content: string) => border('│') + pad(content) + border('│')

    const lines = [border(`╭${'─'.repeat(inner)}╮`), row(` ${this.theme.fg('accent', '✻ Shortcuts')}`), row('')]
    for (const [key, desc] of SHORTCUTS) {
      lines.push(row(`  ${this.theme.fg('accent', key.padEnd(keyWidth))}  ${this.theme.fg('text', desc)}`))
    }
    lines.push(
      row(''),
      row(` ${this.theme.fg('dim', 'any key closes · ? to type a literal ?')}`),
      border(`╰${'─'.repeat(inner)}╯`),
    )
    return lines
  }

  invalidate(): void {}
}

const isPrintableKey = (data: string) =>
  data.length >= 1 && data.charCodeAt(0) >= 32 && data.charCodeAt(0) !== 127 && !data.startsWith('\x1b')

export default function ccEditor(pi: ExtensionAPI) {
  const toolCounts = new Map<string, number>()

  const showShortcuts = (ctx: ExtensionContext) =>
    ctx.ui.custom<string>((_tui, theme, _kb, done) => new ShortcutsOverlay(theme, done), { overlay: true })

  pi.registerCommand('shortcuts', {
    description: 'Show Tau key shortcuts',
    handler: async (_args, ctx) => {
      await showShortcuts(ctx)
    },
  })

  pi.on('tool_call', (event) => {
    toolCounts.set(event.toolName, (toolCounts.get(event.toolName) ?? 0) + 1)
  })

  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    ctx.ui.setFooter(
      (_tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) =>
        new CcFooter(ctx, theme, footerData, toolCounts),
    )

    class CcRoundedEditor extends CustomEditor {
      constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) {
        super(tui, theme, keybindings, { paddingX: 0 })
      }

      handleInput(data: string): void {
        if (data === '?' && this.getText().length === 0) {
          void showShortcuts(ctx).then((dismissKey) => {
            // '?' inserts a literal '?'; any other printable key the user typed
            // to dismiss is forwarded, so the overlay is a peek that never eats input.
            if (dismissKey === '?') super.handleInput('?')
            else if (isPrintableKey(dismissKey)) super.handleInput(dismissKey)
          })
          return
        }

        super.handleInput(data)
      }

      render(width: number): string[] {
        const lines = super.render(width)
        if (lines.length < 2) return lines

        const thm = ctx.ui.theme
        const border = (text: string) => this.borderColor(text)
        const bottomLeft = thm.fg('muted', ` ${formatModel(ctx)} `)
        const bottomRight = thm.fg('muted', ` ${formatContextPercent(ctx)} · ${formatCwd(ctx.cwd)} `)

        lines[0] = fitRounded('', '', width, '╭', '╮', border)
        lines[lines.length - 1] = fitRounded(bottomLeft, bottomRight, width, '╰', '╯', border)
        return lines
      }
    }

    ctx.ui.setEditorComponent((tui, theme, keybindings) => new CcRoundedEditor(tui, theme, keybindings))
  })
}
