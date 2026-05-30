import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from '@earendil-works/pi-coding-agent'
import type { Component, TUI } from '@earendil-works/pi-tui'

const PURPOSE_KEY = 'tau-purpose'

const cleanPurpose = (value: string | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

class PurposeWidget implements Component {
  private readonly getPurpose: () => string
  private readonly theme: Theme

  constructor(getPurpose: () => string, theme: Theme) {
    this.getPurpose = getPurpose
    this.theme = theme
  }

  render(): string[] {
    const purpose = this.getPurpose()
    if (!purpose) return []

    return [this.theme.fg('dim', `purpose ${purpose}`)]
  }

  invalidate(): void {}
}

const updatePurposeUi = (ctx: ExtensionContext, purpose: string) => {
  ctx.ui.setStatus(PURPOSE_KEY, purpose ? `purpose ${purpose}` : undefined)
  ctx.ui.setWidget(
    PURPOSE_KEY,
    purpose ? (_tui: TUI, theme: Theme) => new PurposeWidget(() => purpose, theme) : undefined,
    { placement: 'aboveEditor' },
  )
}

const askPurpose = async (ctx: ExtensionContext) => {
  if (!ctx.hasUI) return ''

  const answer = await ctx.ui.input('Session purpose', 'What are we doing now?')
  return cleanPurpose(answer)
}

const addPurposeToPrompt = (event: BeforeAgentStartEvent, purpose: string) => {
  if (!purpose) return event.systemPrompt

  return `${event.systemPrompt}\n\nSession purpose: ${purpose}`
}

export default function purposeGate(pi: ExtensionAPI) {
  let purpose = cleanPurpose(process.env.TAU_PURPOSE)

  pi.on('session_start', (_event, ctx) => {
    updatePurposeUi(ctx, purpose)
  })

  pi.on('before_agent_start', async (event, ctx): Promise<BeforeAgentStartEventResult> => {
    if (!purpose) purpose = await askPurpose(ctx)
    updatePurposeUi(ctx, purpose)

    return { systemPrompt: addPurposeToPrompt(event, purpose) }
  })

  pi.registerCommand('purpose', {
    description: 'Set session purpose',
    handler: async (args, ctx) => {
      const nextPurpose = cleanPurpose(args) || (await askPurpose(ctx))
      if (!nextPurpose) return

      purpose = nextPurpose
      updatePurposeUi(ctx, purpose)
      ctx.ui.notify(`purpose ${purpose}`)
    },
  })
}
