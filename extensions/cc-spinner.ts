import type { ExtensionAPI, ExtensionContext, WorkingIndicatorOptions } from '@earendil-works/pi-coding-agent'

const STARS = ['✻', '✳', '✶', '✺', '✷']
const VERBS = [
  'Cogitating',
  'Pondering',
  'Schlepping',
  'Noodling',
  'Percolating',
  'Ruminating',
  'Conjuring',
  'Tinkering',
]
const INTERVAL_MS = 140

const buildIndicator = (ctx: ExtensionContext): WorkingIndicatorOptions => {
  const frames = VERBS.flatMap((verb) =>
    STARS.map((star) => ctx.ui.theme.fg('accent', `${star} ${verb}…`)),
  )

  return { frames, intervalMs: INTERVAL_MS }
}

export default function ccSpinner(pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => {
    if (!ctx.hasUI) return

    ctx.ui.setWorkingIndicator(buildIndicator(ctx))
  })

  pi.registerCommand('spinner', {
    description: '/spinner reset restores the default Pi indicator',
    handler: async (args, ctx) => {
      if (args.trim().toLowerCase() === 'reset') {
        ctx.ui.setWorkingIndicator()
        ctx.ui.notify('spinner reset to default')
        return
      }

      ctx.ui.setWorkingIndicator(buildIndicator(ctx))
      ctx.ui.notify('spinner set to tau stars')
    },
  })
}
