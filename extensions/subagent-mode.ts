import { createAgentSession, SessionManager, type ExtensionAPI } from '@earendil-works/pi-coding-agent'

type SubagentStatus = 'running' | 'done' | 'error' | 'cancelled'

type SubagentEvent = {
  at: number
  text: string
  type: 'start' | 'prompt' | 'assistant' | 'tool' | 'completion' | 'error'
}

type SubagentJob = {
  id: number
  label: string
  originalPrompt: string
  result: string
  status: SubagentStatus
  startedAt: number
  finishedAt?: number
  currentSummary: string
  lastActivity: string
  events: SubagentEvent[]
}

const SUBAGENT_KEY = 'tau-subagents'
const STATUS_DONE = { status: 'done' }
const STATUS_ERROR = { status: 'error' }
const STATUS_CANCELLED = { status: 'cancelled' }
const MAX_EVENT_TEXT = 500
const MAX_PROMPT_PREVIEW = 90
const MAX_RESULT_PREVIEW = 700
const RECENT_EVENTS = 12

const now = () => Date.now()

const truncateText = (value: string, limit: number) => {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (compact.length <= limit) return compact
  return `${compact.slice(0, limit - 18).trimEnd()} ... [truncated]`
}

const formatElapsed = (job: SubagentJob) => {
  const elapsed = (job.finishedAt ?? now()) - job.startedAt
  if (elapsed < 60_000) return `${(elapsed / 1000).toFixed(1)}s`
  return `${Math.floor(elapsed / 60_000)}m ${Math.round((elapsed % 60_000) / 1000)}s`
}

const promptPreview = (job: SubagentJob) => truncateText(job.originalPrompt, MAX_PROMPT_PREVIEW)

const makeLabel = (prompt: string) => truncateText(prompt, 36) || 'subagent'

const recordEvent = (job: SubagentJob, type: SubagentEvent['type'], text: string) => {
  if (!text || isThinkingText(text)) return
  job.events.push({ at: now(), text: truncateText(text, MAX_EVENT_TEXT), type })
}

const isThinkingText = (value: string) => /thinking|reasoning_delta|thinking_delta/i.test(value)

const summarize = (jobs: SubagentJob[]) => {
  if (jobs.length === 0) return 'subagents 0'
  const count = (status: SubagentStatus) => jobs.filter((job) => job.status === status).length
  return `subagents r${count('running')} d${count('done')} e${count('error')} c${count('cancelled')}`
}

const renderStatusCard = (job: SubagentJob) =>
  [
    `#${job.id} ${job.status} ${job.label}`,
    `elapsed ${formatElapsed(job)} | last ${job.lastActivity}`,
    `prompt ${promptPreview(job)}`,
  ].join('\n')

const renderList = (jobs: SubagentJob[]) => {
  if (jobs.length === 0) return 'subagents none'
  return jobs.map((job) => `#${job.id} ${job.status} ${formatElapsed(job)} | ${promptPreview(job)}`).join('\n')
}

const renderTimeline = (job: SubagentJob) =>
  job.events.slice(-RECENT_EVENTS).map((event) => `- ${event.type}: ${event.text}`).join('\n') || 'events none'

const renderShow = (job: SubagentJob) =>
  [
    renderStatusCard(job),
    '',
    `summary ${job.currentSummary || 'pending'}`,
    `prompt ${job.originalPrompt}`,
    `result ${truncateText(job.result, MAX_RESULT_PREVIEW) || '(pending)'}`,
    '',
    'events',
    renderTimeline(job),
  ].join('\n')

const renderOpenFallback = (job: SubagentJob) =>
  [`subagent ${job.id} detail fallback`, 'Pi detail navigation unavailable in this extension.', '', renderShow(job)].join('\n')

const findJob = (jobs: SubagentJob[], value: string) => jobs.find((job) => job.id === Number(value.trim()))

const eventText = (event: any) => {
  const messageEvent = event?.assistantMessageEvent
  if (!messageEvent || isThinkingText(messageEvent.type ?? '')) return ''
  return String(messageEvent.delta ?? messageEvent.text ?? messageEvent.content ?? '')
}

const toolName = (event: any) => event?.toolName ?? event?.assistantMessageEvent?.toolName ?? event?.assistantMessageEvent?.name

const updateStatus = (pi: ExtensionAPI, jobs: SubagentJob[]) => {
  pi.appendEntry(SUBAGENT_KEY, { jobs })
}

const setJobStatus = (job: SubagentJob, status: SubagentStatus) => {
  job.status = status
  job.finishedAt = status === 'running' ? undefined : now()
}

const sendStatus = (pi: ExtensionAPI, job: SubagentJob) => {
  pi.sendMessage({ customType: SUBAGENT_KEY, content: renderStatusCard(job), display: false, details: job })
}

const markDone = (pi: ExtensionAPI, job: SubagentJob, jobs: SubagentJob[]) => {
  setJobStatus(job, STATUS_DONE.status as SubagentStatus)
  recordEvent(job, 'completion', 'done')
  updateStatus(pi, jobs)
  sendStatus(pi, job)
}

const markError = (pi: ExtensionAPI, job: SubagentJob, jobs: SubagentJob[], error: unknown) => {
  setJobStatus(job, STATUS_ERROR.status as SubagentStatus)
  job.currentSummary = error instanceof Error ? error.message : String(error)
  recordEvent(job, 'error', job.currentSummary)
  updateStatus(pi, jobs)
  sendStatus(pi, job)
}

const updateFromEvent = (job: SubagentJob, event: any) => {
  const name = toolName(event)
  if (name) {
    job.lastActivity = `tool ${name}`
    recordEvent(job, 'tool', String(name))
  }

  const text = eventText(event)
  if (!text) return
  job.result += text
  job.lastActivity = 'assistant'
  job.currentSummary = truncateText(text, 140)
  recordEvent(job, 'assistant', text)
}

const runSubagent = async (
  pi: ExtensionAPI,
  job: SubagentJob,
  cwd: string,
  jobs: SubagentJob[],
  notify: (text: string) => void,
) => {
  const { session } = await createAgentSession({
    cwd,
    model: undefined,
    sessionManager: SessionManager.inMemory(cwd),
    tools: ['read', 'grep', 'find', 'ls'],
  })

  try {
    session.subscribe((event) => updateFromEvent(job, event))
    await session.prompt(job.originalPrompt)
    markDone(pi, job, jobs)
    notify(renderStatusCard(job))
  } catch (error) {
    markError(pi, job, jobs, error)
    notify(renderStatusCard(job))
  } finally {
    session.dispose()
  }
}

const createJob = (id: number, prompt: string): SubagentJob => {
  const job: SubagentJob = {
    id,
    label: makeLabel(prompt),
    originalPrompt: prompt,
    result: '',
    status: 'running',
    startedAt: now(),
    currentSummary: 'starting',
    lastActivity: 'start',
    events: [],
  }
  recordEvent(job, 'start', `subagent ${id} started`)
  recordEvent(job, 'prompt', prompt)
  return job
}

const handleKnownAction = (jobs: SubagentJob[], args: string, notify: (text: string) => void) => {
  const parts = args.trim().split(/\s+/)
  const [action, id] = parts
  if (args.trim() === 'list') return notify(renderList(jobs))
  if (action === 'show') return notify(findJob(jobs, id ?? '') ? renderShow(findJob(jobs, id ?? '')!) : 'subagent not found')
  if (action === 'open') return notify(findJob(jobs, id ?? '') ? renderOpenFallback(findJob(jobs, id ?? '')!) : 'subagent not found')
  return false
}

export default function subagentMode(pi: ExtensionAPI) {
  const jobs: SubagentJob[] = []

  pi.on('session_start', (_event, ctx) => {
    ctx.ui.setStatus(SUBAGENT_KEY, summarize(jobs))
  })

  pi.registerCommand('sub list', {
    description: 'List Tau subagents',
    handler: async (_args, ctx) => ctx.ui.notify(renderList(jobs)),
  })

  pi.registerCommand('sub show', {
    description: 'Show Tau subagent detail',
    handler: async (args, ctx) => ctx.ui.notify(findJob(jobs, args) ? renderShow(findJob(jobs, args)!) : 'subagent not found'),
  })

  pi.registerCommand('sub open', {
    description: 'Open Tau subagent detail or fallback',
    handler: async (args, ctx) => ctx.ui.notify(findJob(jobs, args) ? renderOpenFallback(findJob(jobs, args)!) : 'subagent not found'),
  })

  pi.registerCommand('sub', {
    description: 'Run a limited-tools background subagent',
    handler: async (args, ctx) => {
      const prompt = args.trim()
      if (!prompt) return ctx.ui.notify('usage: /sub <task> | /sub list | /sub show <id> | /sub open <id>', 'warning')
      if (handleKnownAction(jobs, prompt, (text) => ctx.ui.notify(text)) !== false) return

      const job = createJob(jobs.length + 1, prompt)
      jobs.push(job)
      ctx.ui.setStatus(SUBAGENT_KEY, summarize(jobs))
      ctx.ui.notify(renderStatusCard(job))
      sendStatus(pi, job)
      updateStatus(pi, jobs)

      void runSubagent(pi, job, ctx.cwd, jobs, (text) => ctx.ui.notify(text)).finally(() => {
        ctx.ui.setStatus(SUBAGENT_KEY, summarize(jobs))
      })
    },
  })
}
