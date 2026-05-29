import type {
  AgentToolResult,
  BashToolDetails,
  EditToolDetails,
  ExtensionAPI,
  Theme,
  ToolRenderResultOptions,
} from '@earendil-works/pi-coding-agent'
import {
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
} from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'

const MAX_LINES = 12
const ARG_MAX = 72

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value

const textContent = (result: AgentToolResult<unknown>) => {
  const content = result.content[0]
  return content?.type === 'text' ? content.text : ''
}

const firstLine = (text: string) => text.split('\n').find((line) => line.trim()) ?? ''

const callLine = (theme: Theme, label: string, arg: string | undefined) => {
  let text = `${theme.fg('accent', '●')} ${theme.fg('toolTitle', theme.bold(label))}`
  if (arg) text += theme.fg('dim', `(${truncate(arg, ARG_MAX)})`)
  return new Text(text, 0, 0)
}

const resultLine = (theme: Theme, summary: string, body: string[]) => {
  let text = `  ${theme.fg('dim', '⎿')} ${summary}`
  for (const line of body) text += `\n    ${theme.fg('dim', line)}`
  return new Text(text, 0, 0)
}

const bodyLines = (text: string, expanded: boolean) => {
  if (!expanded) return []

  const lines = text.split('\n')
  if (lines.length <= MAX_LINES) return lines
  return [...lines.slice(0, MAX_LINES), `… +${lines.length - MAX_LINES} more lines`]
}

const countSummary = (noun: string) => (
  result: AgentToolResult<unknown>,
  options: ToolRenderResultOptions,
  theme: Theme,
) => {
  if (options.isPartial) return resultLine(theme, theme.fg('warning', 'working…'), [])

  const text = textContent(result)
  if (text.startsWith('Error')) return resultLine(theme, theme.fg('error', firstLine(text)), [])

  const lines = text.split('\n').filter((line) => line.trim())
  const summary = theme.fg('success', `${lines.length} ${noun}`)
  return resultLine(theme, summary, bodyLines(lines.join('\n'), options.expanded))
}

const bashSummary = (
  result: AgentToolResult<BashToolDetails | undefined>,
  options: ToolRenderResultOptions,
  theme: Theme,
) => {
  if (options.isPartial) return resultLine(theme, theme.fg('warning', 'running…'), [])

  const output = textContent(result)
  const exit = output.match(/exit code: (\d+)/)
  const code = exit ? Number(exit[1]) : 0
  const lines = output.split('\n').filter((line) => line.trim())
  const summary = code === 0 ? theme.fg('success', `${lines.length} lines`) : theme.fg('error', `exit ${code}`)
  return resultLine(theme, summary, bodyLines(output, options.expanded))
}

const editSummary = (
  result: AgentToolResult<EditToolDetails | undefined>,
  options: ToolRenderResultOptions,
  theme: Theme,
) => {
  if (options.isPartial) return resultLine(theme, theme.fg('warning', 'editing…'), [])

  const text = textContent(result)
  if (text.startsWith('Error')) return resultLine(theme, theme.fg('error', firstLine(text)), [])

  const diff = result.details?.diff
  if (!diff) return resultLine(theme, theme.fg('success', 'updated'), [])

  const diffLines = diff.split('\n')
  const added = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length
  const removed = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length
  const summary = `${theme.fg('success', `+${added}`)} ${theme.fg('error', `-${removed}`)}`
  return resultLine(theme, summary, bodyLines(diff, options.expanded))
}

const registerTools = (pi: ExtensionAPI, cwd: string) => {
  const register = <Args extends Record<string, unknown>>(
    name: string,
    label: string,
    original: ReturnType<typeof createReadTool>,
    getArg: (args: Args) => string | undefined,
    summarize: (result: AgentToolResult<any>, options: ToolRenderResultOptions, theme: Theme) => Text,
  ) => {
    pi.registerTool({
      name,
      label,
      description: original.description,
      parameters: original.parameters,
      renderShell: 'self',
      async execute(toolCallId, params, signal, onUpdate) {
        return original.execute(toolCallId, params, signal, onUpdate)
      },
      renderCall: (args: Args, theme: Theme) => callLine(theme, label, getArg(args)),
      renderResult: (result, options, theme) => summarize(result, options, theme),
    })
  }

  register('read', 'Read', createReadTool(cwd), (a) => a.path as string, countSummary('lines'))
  register('bash', 'Bash', createBashTool(cwd), (a) => a.command as string, bashSummary)
  register('edit', 'Update', createEditTool(cwd), (a) => a.path as string, editSummary)
  register('write', 'Write', createWriteTool(cwd), (a) => a.path as string, countSummary('written'))
  register('ls', 'List', createLsTool(cwd), (a) => (a.path as string) ?? '.', countSummary('entries'))
  register('grep', 'Search', createGrepTool(cwd), (a) => a.pattern as string, countSummary('matches'))
  register('find', 'Find', createFindTool(cwd), (a) => a.pattern as string, countSummary('matches'))
}

export default function ccTools(pi: ExtensionAPI) {
  pi.on('session_start', (_event, ctx) => registerTools(pi, ctx.cwd))
}
