import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'
import { Key } from '@earendil-works/pi-tui'

const THEME_KEY = 'tau-theme'
const themeDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.pi', 'themes')
const tauThemes = ['tau-dark', 'tau-focus', 'tau-alert']

const themePath = (name: string) => join(themeDir, `${name}.json`)
const projectThemeDir = (cwd: string) => resolve(cwd, '.pi', 'themes')
const shouldRegisterTauThemes = (cwd: string) => resolve(themeDir) !== projectThemeDir(cwd)
const cleanThemeName = (value: string) => value.trim()

const availableThemeNames = (ctx: ExtensionContext) => ctx.ui.getAllThemes().map((theme) => theme.name)

const currentThemeName = (ctx: ExtensionContext) => ctx.ui.theme.name ?? 'unknown'

const updateThemeStatus = (ctx: ExtensionContext) => {
  ctx.ui.setStatus(THEME_KEY, `theme ${currentThemeName(ctx)}`)
}

const switchTheme = (themeName: string, ctx: ExtensionContext) => {
  const result = ctx.ui.setTheme(themeName)
  if (!result.success) {
    ctx.ui.notify(`Theme not found: ${themeName}. Available: ${availableThemeNames(ctx).join(', ')}`, 'warning')
    return
  }

  updateThemeStatus(ctx)
  ctx.ui.notify(`theme ${themeName}`)
}

const cycleTheme = (ctx: ExtensionContext, direction: 1 | -1) => {
  const names = availableThemeNames(ctx)
  if (names.length === 0) {
    ctx.ui.notify('No themes available', 'warning')
    return
  }

  const currentIndex = names.indexOf(currentThemeName(ctx))
  const startIndex = currentIndex === -1 ? 0 : currentIndex
  const nextIndex = (startIndex + direction + names.length) % names.length

  switchTheme(names[nextIndex], ctx)
}

export default function themeCycler(pi: ExtensionAPI) {
  pi.on('resources_discover', (event) => {
    if (!shouldRegisterTauThemes(event.cwd)) return {}

    return { themePaths: tauThemes.map(themePath) }
  })

  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    updateThemeStatus(ctx)
  })

  pi.registerShortcut(Key.ctrlShift('t'), {
    description: 'Next Tau theme',
    handler: (ctx) => cycleTheme(ctx, 1),
  })

  pi.registerShortcut(Key.ctrlAlt('t'), {
    description: 'Previous Tau theme',
    handler: (ctx) => cycleTheme(ctx, -1),
  })

  pi.registerCommand('theme', {
    description: '/theme <name> lists or switches themes',
    getArgumentCompletions: async (_prefix) => tauThemes.map((name) => ({ value: name, label: name })),
    handler: async (args, ctx) => {
      const themeName = cleanThemeName(args)
      if (!themeName) {
        ctx.ui.notify(`themes: ${availableThemeNames(ctx).join(', ')}`)
        updateThemeStatus(ctx)
        return
      }

      switchTheme(themeName, ctx)
    },
  })
}
