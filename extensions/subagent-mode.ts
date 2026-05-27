import { createAgentSession, SessionManager, type ExtensionAPI } from '@earendil-works/pi-coding-agent'

type SubagentStatus = 'running' | 'done' | 'error'

type SubagentJob = {
  id: number
  prompt: string
  result: string
  status: SubagentStatus
  startedAt: number
  finishedAt?: number
}

const SUBAGENT_KEY = 'tau-subagents'
const STATUS_DONE = { status: 'done' }
const STATUS_ERROR = { status: 'error' }

const resolvePreviewLimit = () => {
  const value = Number(process.env.TAU_SUBAGENT_MAX_PREVIEW)
  if (!Number.isFinite(value) || value <= 0) return 1200
  return Math.floor(value)
}

const MAX_PREVIEW = resolvePreviewLimit()

const summarize = (jobs: SubagentJob[]) => {
  if (jobs.length === 0) return 'subagents 0'

  const running = jobs.filter((job) => job.status === 'running').length
  const done = jobs.filter((job) => job.status === 'done').length
  const error = jobs.filter((job) => job.status === 'error').length
  return `subagents r${running} d${done} e${error}`
}

const toSeconds = (value: number) => `${(value / 1000).toFixed(1)}s`

const concisePreview = (value: string) => {
  if (!value) return '(no text result)'
  if (value.length <= MAX_PREVIEW) return value

  return `${value.slice(0, MAX_PREVIEW - 1).trimEnd()} ...`
}

const updateStatus = (pi: ExtensionAPI, jobs: SubagentJob[]) => {
  pi.appendEntry(SUBAGENT_KEY, { jobs })
}

const setJobStatus = (job: SubagentJob, status: SubagentStatus) => {
  job.status = status
}

const runSubagent = async (pi: ExtensionAPI, job: SubagentJob, cwd: string, jobs: SubagentJob[]) => {
  const { session } = await createAgentSession({
    cwd,
    model: undefined,
    sessionManager: SessionManager.inMemory(cwd),
    tools: ['read', 'grep', 'find', 'ls'],
  })

  try {
    session.subscribe((event) => {
      if (event.type !== 'message_update') return
      if (event.assistantMessageEvent.type !== 'text_delta') return

      job.result += event.assistantMessageEvent.delta
    })

    await session.prompt(job.prompt)
    setJobStatus(job, STATUS_DONE.status as SubagentStatus)
    job.finishedAt = Date.now()
    updateStatus(pi, jobs)

    const duration = job.finishedAt - job.startedAt
    const preview = concisePreview(job.result)
    pi.sendMessage({
      customType: SUBAGENT_KEY,
      content: `subagent ${job.id} done (${toSeconds(duration)})\n${preview}`,
      display: true,
      details: { id: job.id, status: job.status },
    })
  } catch (error) {
    setJobStatus(job, STATUS_ERROR.status as SubagentStatus)
    job.finishedAt = Date.now()
    job.result = error instanceof Error ? error.message : String(error)
    updateStatus(pi, jobs)
    pi.sendMessage({
      customType: SUBAGENT_KEY,
      content: `subagent ${job.id} error (${toSeconds((job.finishedAt ?? Date.now()) - job.startedAt)})\n${concisePreview(job.result)}`,
      display: true,
      details: { id: job.id, status: job.status },
    })
  } finally {
    session.dispose()
  }
}

export default function subagentMode(pi: ExtensionAPI) {
  const jobs: SubagentJob[] = []

  pi.on('session_start', (_event, ctx) => {
    ctx.ui.setStatus(SUBAGENT_KEY, summarize(jobs))
  })

  pi.registerCommand('sub', {
    description: 'Run a limited-tools background subagent',
    handler: async (args, ctx) => {
      const prompt = args.trim()
      if (!prompt) {
        ctx.ui.notify('usage: /sub <task>', 'warning')
        return
      }

      const job = {
        id: jobs.length + 1,
        prompt,
        result: '',
        status: 'running' as SubagentStatus,
        startedAt: Date.now(),
      }
      jobs.push(job)
      ctx.ui.setStatus(SUBAGENT_KEY, summarize(jobs))
      ctx.ui.notify(`subagent ${job.id} running`)
      pi.sendMessage({
        customType: SUBAGENT_KEY,
        content: `subagent ${job.id} running`,
        display: false,
        details: { id: job.id, status: job.status },
      })
      updateStatus(pi, jobs)

      void runSubagent(pi, job, ctx.cwd, jobs).finally(() => {
        ctx.ui.setStatus(SUBAGENT_KEY, summarize(jobs))
      })
    },
  })
}
