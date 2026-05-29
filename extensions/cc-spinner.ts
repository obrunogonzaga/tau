import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'

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
const STAR_INTERVAL_MS = 140
const MESSAGE_INTERVAL_MS = 1000
const SECONDS_PER_VERB = 4

const starIndicator = (ctx: ExtensionContext) => ({
  frames: STARS.map((star) => ctx.ui.theme.fg('accent', star)),
  intervalMs: STAR_INTERVAL_MS,
})

const workingMessage = (ctx: ExtensionContext, startedAt: number) => {
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const verb = VERBS[Math.floor(elapsed / SECONDS_PER_VERB) % VERBS.length]
  return `${ctx.ui.theme.fg('accent', `${verb}…`)}${ctx.ui.theme.fg('dim', ` (${elapsed}s · esc to interrupt)`)}`
}

export default function ccSpinner(pi: ExtensionAPI) {
  let sessionCtx: ExtensionContext | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
  }

  const startMessage = () => {
    const ctx = sessionCtx
    if (!ctx?.hasUI) return

    stop()
    const startedAt = Date.now()
    const tick = () => ctx.ui.setWorkingMessage(workingMessage(ctx, startedAt))
    tick()
    timer = setInterval(tick, MESSAGE_INTERVAL_MS)
  }

  pi.on('session_start', (_event, ctx) => {
    sessionCtx = ctx
    if (ctx.hasUI) ctx.ui.setWorkingIndicator(starIndicator(ctx))
  })

  pi.on('agent_start', () => startMessage())

  pi.on('agent_end', () => {
    stop()
    if (sessionCtx?.hasUI) sessionCtx.ui.setWorkingMessage()
  })

  pi.on('session_shutdown', () => stop())

  pi.registerCommand('spinner', {
    description: '/spinner reset restores the default Pi indicator',
    handler: async (args, ctx) => {
      sessionCtx = ctx
      if (args.trim().toLowerCase() === 'reset') {
        stop()
        ctx.ui.setWorkingIndicator()
        ctx.ui.setWorkingMessage()
        ctx.ui.notify('spinner reset to default')
        return
      }

      ctx.ui.setWorkingIndicator(starIndicator(ctx))
      ctx.ui.notify('spinner set to tau stars')
    },
  })
}
