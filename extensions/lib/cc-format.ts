import type { ExtensionContext, ReadonlyFooterDataProvider } from '@earendil-works/pi-coding-agent'
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui'

export const formatCwd = (cwd: string) => {
  const home = process.env.HOME
  return home && cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd
}

export const formatModel = (ctx: ExtensionContext, fallback = 'no model') =>
  ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : fallback

export const formatContextPercent = (ctx: ExtensionContext) => {
  const usage = ctx.getContextUsage()
  if (!usage || usage.percent === null) return 'ctx ?'
  return `ctx ${Math.round(usage.percent)}%`
}

export const formatCost = (ctx: ExtensionContext) => {
  const stats = (ctx as unknown as { getSessionStats?: () => { cost?: number } }).getSessionStats?.()
  return typeof stats?.cost === 'number' ? `$${stats.cost.toFixed(4)}` : '$?'
}

export const formatTools = (toolCounts: ReadonlyMap<string, number>) => {
  if (toolCounts.size === 0) return 'tools 0'

  return [...toolCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name}:${count}`)
    .join(' ')
}

export const formatStatuses = (footerData: ReadonlyFooterDataProvider) =>
  [...footerData.getExtensionStatuses().values()].map((status) => status.replace(/\s+/g, ' ').trim())

export const fit = (text: string, width: number, align: 'left' | 'center'): string => {
  const w = visibleWidth(text)
  if (w > width) return truncateToWidth(text, width, '…')

  const padding = width - w
  if (align === 'center') {
    const left = Math.floor(padding / 2)
    return `${' '.repeat(left)}${text}${' '.repeat(padding - left)}`
  }
  return `${text}${' '.repeat(padding)}`
}

export const fitRounded = (
  left: string,
  right: string,
  width: number,
  leftCorner: string,
  rightCorner: string,
  border: (text: string) => string,
): string => {
  if (width <= 1) return border(leftCorner)

  let leftText = left
  let rightText = right
  const minimumGap = 3

  while (2 + visibleWidth(leftText) + visibleWidth(rightText) + minimumGap > width && visibleWidth(rightText) > 0) {
    rightText = truncateToWidth(rightText, Math.max(0, visibleWidth(rightText) - 1), '')
  }
  while (2 + visibleWidth(leftText) + visibleWidth(rightText) + minimumGap > width && visibleWidth(leftText) > 0) {
    leftText = truncateToWidth(leftText, Math.max(0, visibleWidth(leftText) - 1), '')
  }

  const gap = Math.max(0, width - 2 - visibleWidth(leftText) - visibleWidth(rightText))
  return `${border(leftCorner)}${leftText}${border('─'.repeat(gap))}${rightText}${border(rightCorner)}`
}
