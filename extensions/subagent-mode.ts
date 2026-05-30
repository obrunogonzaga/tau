import { createAgentSession, SessionManager, type ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { createSubagentStore } from './lib/subagent-store.js'

const SUBAGENT_KEY = 'tau-subagents'
const USAGE = 'usage: /sub <task> | /sub list | /sub show <id> | /sub open <id> | /sub cancel <id>'

const runSubagent = async (
  pi: ExtensionAPI,
  store: ReturnType<typeof createSubagentStore>,
  jobId: number,
  cwd: string,
  notify: (text: string) => void,
  setSession: (session: any) => void,
) => {
  const { session } = await createAgentSession({
    cwd,
    model: undefined,
    sessionManager: SessionManager.inMemory(cwd),
    tools: ['read', 'grep', 'find', 'ls'],
  })

  try {
    setSession(session)
    session.subscribe((event) => store.updateFromEvent(jobId, event))
    const job = store.find(jobId)
    if (!job || job.status !== 'running') return
    await session.prompt(job.originalPrompt)
    if (store.finish(jobId)) {
      updateStatus(pi, store)
      sendStatus(pi, store, jobId)
      notify(store.statusCard(jobId))
    }
  } catch (error) {
    if (store.fail(jobId, error)) {
      updateStatus(pi, store)
      sendStatus(pi, store, jobId)
      notify(store.statusCard(jobId))
    }
  } finally {
    session.dispose()
  }
}

const updateStatus = (pi: ExtensionAPI, store: ReturnType<typeof createSubagentStore>) => {
  pi.appendEntry(SUBAGENT_KEY, { jobs: store.jobs })
}

const sendStatus = (pi: ExtensionAPI, store: ReturnType<typeof createSubagentStore>, jobId: number) => {
  const job = store.find(jobId)
  pi.sendMessage({ customType: SUBAGENT_KEY, content: store.statusCard(jobId), display: false, details: job })
}

const handleKnownAction = (
  store: ReturnType<typeof createSubagentStore>,
  sessions: Map<number, any>,
  args: string,
  notify: (text: string, level?: string) => void,
) => {
  const parts = args.trim().split(/\s+/)
  const [action, id] = parts
  if (args.trim() === 'list') return notify(store.list())
  if (action === 'show') return notify(store.show(id ?? ''))
  if (action === 'open') return notify(store.open(id ?? ''))
  if (action === 'cancel') {
    if (!store.cancel(id ?? '')) return notify('subagent not found or not running', 'warning')
    sessions.get(Number(id))?.dispose()
    sessions.delete(Number(id))
    return notify(store.statusCard(Number(id)))
  }
  return false
}

export default function subagentMode(pi: ExtensionAPI) {
  const store = createSubagentStore()
  const sessions = new Map<number, any>()

  pi.on('session_start', (_event, ctx) => {
    ctx.ui.setStatus(SUBAGENT_KEY, store.summary())
  })

  pi.registerCommand('sub list', {
    description: 'List Tau subagents',
    handler: async (_args, ctx) => ctx.ui.notify(store.list()),
  })

  pi.registerCommand('sub show', {
    description: 'Show Tau subagent detail',
    handler: async (args, ctx) => ctx.ui.notify(store.show(args)),
  })

  pi.registerCommand('sub open', {
    description: 'Open Tau subagent detail or fallback',
    handler: async (args, ctx) => ctx.ui.notify(store.open(args)),
  })

  pi.registerCommand('sub cancel', {
    description: 'Cancel Tau subagent',
    handler: async (args, ctx) => {
      if (!store.cancel(args)) return ctx.ui.notify('subagent not found or not running', 'warning')
      sessions.get(Number(args.trim()))?.dispose()
      sessions.delete(Number(args.trim()))
      updateStatus(pi, store)
      ctx.ui.setStatus(SUBAGENT_KEY, store.summary())
      ctx.ui.notify(store.statusCard(Number(args.trim())))
    },
  })

  pi.registerCommand('sub', {
    description: 'Run a limited-tools background subagent',
    handler: async (args, ctx) => {
      const prompt = args.trim()
      if (!prompt) return ctx.ui.notify(USAGE, 'warning')
      if (handleKnownAction(store, sessions, prompt, (text, level) => ctx.ui.notify(text, level)) !== false) {
        updateStatus(pi, store)
        ctx.ui.setStatus(SUBAGENT_KEY, store.summary())
        return
      }

      const job = store.create(prompt)
      ctx.ui.setStatus(SUBAGENT_KEY, store.summary())
      ctx.ui.notify(store.statusCard(job.id))
      sendStatus(pi, store, job.id)
      updateStatus(pi, store)

      void runSubagent(pi, store, job.id, ctx.cwd, (text) => ctx.ui.notify(text), (session) => {
        sessions.set(job.id, session)
      }).finally(() => {
        sessions.delete(job.id)
        ctx.ui.setStatus(SUBAGENT_KEY, store.summary())
      })
    },
  })
}
