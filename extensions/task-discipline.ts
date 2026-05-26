import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'

type TaskState = 'pending' | 'in_progress' | 'done'

type Task = {
  id: number
  title: string
  state: TaskState
}

const TASK_KEY = 'tau-tasks'
const STATES = new Set<TaskState>(['pending', 'in_progress', 'done'])

const parseState = (value: string | undefined): TaskState | null => {
  if (!value || !STATES.has(value as TaskState)) return null

  return value as TaskState
}

const nextId = (tasks: Task[]) => Math.max(0, ...tasks.map((task) => task.id)) + 1

const summarizeTasks = (tasks: Task[]) => {
  if (tasks.length === 0) return 'tasks 0'

  const counts = tasks.reduce(
    (total, task) => ({ ...total, [task.state]: total[task.state] + 1 }),
    { pending: 0, in_progress: 0, done: 0 },
  )

  return `tasks p${counts.pending} i${counts.in_progress} d${counts.done}`
}

const renderTasks = (tasks: Task[]) => {
  if (tasks.length === 0) return ['tasks 0']

  return tasks.map((task) => `${task.id}. [${task.state}] ${task.title}`)
}

const updateTasksUi = (ctx: ExtensionContext, tasks: Task[]) => {
  ctx.ui.setStatus(TASK_KEY, summarizeTasks(tasks))
  ctx.ui.setWidget(TASK_KEY, renderTasks(tasks), { placement: 'belowEditor' })
}

const findTask = (tasks: Task[], rawId: string | undefined) => {
  const id = Number(rawId)
  if (!Number.isInteger(id)) return undefined

  return tasks.find((task) => task.id === id)
}

const usage = 'usage: /task add <title> | start <id> | done <id> | set <id> pending|in_progress|done | list'

export default function taskDiscipline(pi: ExtensionAPI) {
  const tasks: Task[] = []

  pi.on('session_start', (_event, ctx) => {
    updateTasksUi(ctx, tasks)
  })

  pi.registerCommand('task', {
    description: 'Track session tasks',
    handler: async (args, ctx) => {
      const [action, rawIdOrTitle, rawState, ...rest] = args.trim().split(/\s+/).filter(Boolean)
      if (!action || action === 'list') {
        updateTasksUi(ctx, tasks)
        ctx.ui.notify(renderTasks(tasks).join('\n'))
        return
      }

      if (action === 'add') {
        const title = [rawIdOrTitle, rawState, ...rest].filter(Boolean).join(' ').trim()
        if (!title) {
          ctx.ui.notify(usage, 'warning')
          return
        }

        tasks.push({ id: nextId(tasks), title, state: 'pending' })
        pi.appendEntry(TASK_KEY, { tasks })
        updateTasksUi(ctx, tasks)
        return
      }

      const task = findTask(tasks, rawIdOrTitle)
      if (!task) {
        ctx.ui.notify(`task missing. ${usage}`, 'warning')
        return
      }

      const state = action === 'start' ? 'in_progress' : action === 'done' ? 'done' : parseState(rawState)
      if (!state) {
        ctx.ui.notify(usage, 'warning')
        return
      }

      task.state = state
      pi.appendEntry(TASK_KEY, { tasks })
      updateTasksUi(ctx, tasks)
    },
  })
}
