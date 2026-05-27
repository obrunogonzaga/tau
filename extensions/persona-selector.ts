import fs from 'node:fs'
import path from 'node:path'
import type {
  BeforeAgentStartEvent,
  BeforeAgentStartEventResult,
  ExtensionAPI,
  ExtensionContext,
} from '@earendil-works/pi-coding-agent'

const PERSONA_KEY = 'tau-persona'
const AGENTS_DIR = path.resolve(process.cwd(), '.pi', 'agents')

const cleanName = (value: string | undefined) => value?.trim().toLowerCase() ?? ''

const agentPath = (name: string) => path.join(AGENTS_DIR, `${name}.md`)

const listPersonas = () => {
  if (!fs.existsSync(AGENTS_DIR)) return []

  return fs
    .readdirSync(AGENTS_DIR)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => path.basename(file, '.md'))
    .sort()
}

const readPersona = (name: string) => fs.readFileSync(agentPath(name), 'utf8').trim()

const updatePersonaStatus = (ctx: ExtensionContext, persona: string) => {
  ctx.ui.setStatus(PERSONA_KEY, persona ? `system persona ${persona}` : undefined)
}

const appendPersonaPrompt = (event: BeforeAgentStartEvent, persona: string) => {
  if (!persona) return event.systemPrompt

  return `${event.systemPrompt}\n\nActive local system persona: ${persona}\n\n${readPersona(persona)}`
}

export default function personaSelector(pi: ExtensionAPI) {
  let persona = cleanName(process.env.TAU_PERSONA)

  pi.on('session_start', (_event, ctx) => {
    if (persona && !fs.existsSync(agentPath(persona))) persona = ''
    updatePersonaStatus(ctx, persona)
  })

  pi.on('before_agent_start', (event, ctx): BeforeAgentStartEventResult => {
    updatePersonaStatus(ctx, persona)

    return { systemPrompt: appendPersonaPrompt(event, persona) }
  })

  pi.registerCommand('system', {
    description: 'Select local system persona',
    handler: async (args, ctx) => {
      const personas = listPersonas()
      const nextPersona = cleanName(args)

      if (!nextPersona || nextPersona === 'list') {
        ctx.ui.notify(`system personas: ${personas.join(', ') || 'none'}`)
        return
      }

      if (!personas.includes(nextPersona)) {
        ctx.ui.notify(`unknown system persona: ${nextPersona}`, 'warning')
        return
      }

      persona = nextPersona
      updatePersonaStatus(ctx, persona)
      ctx.ui.notify(`system persona ${persona}`)
    },
  })
}
