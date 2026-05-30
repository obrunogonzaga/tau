const DEFAULT_MAX_RESULT_TEXT = 24_000
const MAX_EVENT_TEXT = 500
const MAX_PROMPT_PREVIEW = 90
const MAX_RESULT_PREVIEW = 700
const RECENT_EVENTS = 12

const isThinkingText = (value) => /thinking|reasoning_delta|thinking_delta/i.test(value)

const truncateText = (value, limit) => {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (compact.length <= limit) return compact
  return `${compact.slice(0, limit - 18).trimEnd()} ... [truncated]`
}

const capText = (value, limit) => {
  if (value.length <= limit) return value
  return value.slice(value.length - limit)
}

const formatElapsed = (job, now) => {
  const elapsed = (job.finishedAt ?? now()) - job.startedAt
  if (elapsed < 60_000) return `${(elapsed / 1000).toFixed(1)}s`
  return `${Math.floor(elapsed / 60_000)}m ${Math.round((elapsed % 60_000) / 1000)}s`
}

const makeLabel = (prompt) => truncateText(prompt, 36) || 'subagent'

const promptPreview = (job) => truncateText(job.originalPrompt, MAX_PROMPT_PREVIEW)

const eventText = (event) => {
  const messageEvent = event?.assistantMessageEvent
  if (!messageEvent || isThinkingText(messageEvent.type ?? '')) return ''
  return String(messageEvent.delta ?? messageEvent.text ?? messageEvent.content ?? '')
}

const toolName = (event) => event?.toolName ?? event?.assistantMessageEvent?.toolName ?? event?.assistantMessageEvent?.name

export const createSubagentStore = ({ maxResultText = DEFAULT_MAX_RESULT_TEXT, now = () => Date.now() } = {}) => {
  const jobs = []

  const find = (id) => jobs.find((job) => job.id === Number(String(id).trim()))

  const recordEvent = (job, type, text) => {
    if (!text || isThinkingText(text)) return
    job.events.push({ at: now(), text: truncateText(text, MAX_EVENT_TEXT), type })
  }

  const setStatus = (job, status) => {
    job.status = status
    job.finishedAt = status === 'running' ? undefined : now()
  }

  const renderStatusCard = (job) =>
    [
      `#${job.id} ${job.status} ${job.label}`,
      `elapsed ${formatElapsed(job, now)} | last ${job.lastActivity}`,
      `prompt ${promptPreview(job)}`,
    ].join('\n')

  const renderTimeline = (job) =>
    job.events.slice(-RECENT_EVENTS).map((event) => `- ${event.type}: ${event.text}`).join('\n') || 'events none'

  const renderShow = (job) =>
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

  return {
    jobs,
    cancel: (id) => {
      const job = find(id)
      if (!job || job.status !== 'running') return false
      setStatus(job, 'cancelled')
      job.currentSummary = 'cancelled'
      job.lastActivity = 'cancelled'
      recordEvent(job, 'completion', 'cancelled')
      return true
    },
    create: (prompt) => {
      const id = jobs.length + 1
      const job = {
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
      jobs.push(job)
      return job
    },
    fail: (id, error) => {
      const job = find(id)
      if (!job || job.status !== 'running') return false
      setStatus(job, 'error')
      job.currentSummary = error instanceof Error ? error.message : String(error)
      recordEvent(job, 'error', job.currentSummary)
      return true
    },
    find,
    finish: (id) => {
      const job = find(id)
      if (!job || job.status !== 'running') return false
      setStatus(job, 'done')
      recordEvent(job, 'completion', 'done')
      return true
    },
    list: () => {
      if (jobs.length === 0) return 'subagents none'
      return jobs.map((job) => `#${job.id} ${job.status} ${formatElapsed(job, now)} | ${promptPreview(job)}`).join('\n')
    },
    open: (id) => {
      const job = find(id)
      if (!job) return 'subagent not found'
      return [`subagent ${job.id} detail fallback`, 'Pi detail navigation unavailable in this extension.', '', renderShow(job)].join('\n')
    },
    show: (id) => {
      const job = find(id)
      return job ? renderShow(job) : 'subagent not found'
    },
    statusCard: (id) => {
      const job = find(id)
      return job ? renderStatusCard(job) : 'subagent not found'
    },
    summary: () => {
      if (jobs.length === 0) return 'subagents 0'
      const count = (status) => jobs.filter((job) => job.status === status).length
      return `subagents r${count('running')} d${count('done')} e${count('error')} c${count('cancelled')}`
    },
    updateFromEvent: (id, event) => {
      const job = find(id)
      if (!job || job.status !== 'running') return false

      const name = toolName(event)
      if (name) {
        job.lastActivity = `tool ${name}`
        recordEvent(job, 'tool', String(name))
      }

      const text = eventText(event)
      if (!text) return true
      job.result = capText(`${job.result}${text}`, maxResultText)
      job.lastActivity = 'assistant'
      job.currentSummary = truncateText(text, 140)
      recordEvent(job, 'assistant', text)
      return true
    },
  }
}
