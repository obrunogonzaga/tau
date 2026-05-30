declare module '@earendil-works/pi-agent-core' {
  export type AgentTool<TParams = Record<string, unknown>, TDetails = unknown> = {
    description: string
    execute(
      toolCallId: string,
      params: TParams,
      signal?: AbortSignal,
      onUpdate?: AgentToolUpdateCallback<TDetails>,
    ): Promise<AgentToolResult<TDetails>>
    parameters: unknown
  }

  export type AgentMessage = {
    content: unknown
    role: string
  }

  export type AgentToolResult<TDetails = unknown> = {
    content: Array<{ text?: string; type?: string }>
    details?: TDetails
  }

  export type AgentToolUpdateCallback<TDetails = unknown> = (result: AgentToolResult<TDetails>) => void
}

declare module '@earendil-works/pi-coding-agent' {
  import type { AgentTool } from '@earendil-works/pi-agent-core'
  import type { Component, EditorTheme, KeyId, TUI } from '@earendil-works/pi-tui'

  export type BeforeAgentStartEvent = {
    systemPrompt: string
  }

  export type BeforeAgentStartEventResult = {
    systemPrompt: string
  }

  type NotificationLevel = 'info' | 'warning' | 'error' | string
  type WidgetPlacement = 'aboveEditor' | 'belowEditor'
  type WidgetFactory = (tui: TUI, theme: Theme) => Component
  type FooterFactory = (tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => Component
  type HeaderFactory = (tui: TUI, theme: Theme) => Component
  type EditorFactory = (tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) => Component

  export type CustomMessageEntry<T = unknown> = {
    content: string | unknown[]
    customType: string
    details?: T
    display: boolean
    type: 'custom_message'
  }

  export type CustomEntry<T = unknown> = {
    customType: string
    data?: T
    type: 'custom'
  }

  export type SessionMessageEntry = {
    message: AgentMessage
    type: 'message'
  }

  export type SessionEntry = CustomEntry | CustomMessageEntry | SessionMessageEntry

  export type ExtensionUIContext = {
    custom<T>(factory: (tui: TUI, theme: Theme, keybindings: KeybindingsManager, done: (result: T) => void) => Component, options?: unknown): Promise<T>
    getAllThemes(): Theme[]
    input(title: string, placeholder?: string): Promise<string | undefined>
    notify(message: string, level?: NotificationLevel): void
    setEditorComponent(factory: EditorFactory | undefined): void
    setFooter(factory: FooterFactory | undefined): void
    setHeader(factory: HeaderFactory | undefined): void
    setHiddenThinkingLabel(label?: string): void
    setStatus(key: string, value: string | undefined): void
    setTheme(themeName: string): { success: boolean; error?: string }
    setTitle(title: string): void
    setWidget(key: string, content: string[] | WidgetFactory | undefined, options?: { placement?: WidgetPlacement }): void
    setWorkingIndicator(options?: WorkingIndicatorOptions): void
    setWorkingMessage(message?: string): void
    setWorkingVisible(visible: boolean): void
    theme: Theme
  }

  export type ExtensionContext = {
    cwd: string
    getContextUsage?(): ContextUsage
    hasUI: boolean
    model?: {
      id?: string
      provider?: string
      thinking?: string
    }
    sessionManager: {
      getBranch(): SessionEntry[]
    }
    ui: ExtensionUIContext
  }

  export type ExtensionCommandContext = ExtensionContext

  export type ExtensionAPI = {
    appendEntry<T = unknown>(customType: string, data?: T): void
    exec(command: string, args: string[], options?: unknown): Promise<{ stdout?: string }>
    on(eventName: 'agent_end', handler: (event: AgentEndEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'agent_start', handler: (event: AgentStartEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'before_agent_start', handler: (event: BeforeAgentStartEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'resources_discover', handler: (event: ResourcesDiscoverEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'session_shutdown', handler: (event: SessionShutdownEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'session_start', handler: (event: SessionStartEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'tool_call', handler: (event: ToolCallEvent, ctx: ExtensionContext) => unknown): void
    on(eventName: 'tool_execution_start', handler: (event: ToolExecutionStartEvent, ctx: ExtensionContext) => unknown): void
    registerCommand(name: string, command: RegisteredCommand): void
    registerShortcut(shortcut: KeyId, command: ExtensionShortcut): void
    registerTool(tool: RegisteredTool): void
    sendMessage<T = unknown>(message: Pick<CustomMessageEntry<T>, 'content' | 'customType' | 'details' | 'display'>, options?: unknown): void
  }

  export type RegisteredCommand = {
    description?: string
    getArgumentCompletions?: (prefix: string) => Promise<Array<{ label?: string; value: string }>>
    handler: (args: string, ctx: ExtensionCommandContext) => Promise<void> | void
  }

  export type ExtensionShortcut = {
    description?: string
    handler: (ctx: ExtensionContext) => Promise<void> | void
  }

  export type RegisteredTool<TDetails = unknown> = {
    description: string
    execute(...args: Parameters<AgentTool['execute']>): ReturnType<AgentTool['execute']>
    label: string
    name: string
    parameters: unknown
    renderCall?: (args: Record<string, unknown>, theme: Theme, context: ToolRenderContext) => Component
    renderResult?: (result: AgentToolResult<TDetails>, options: ToolRenderResultOptions, theme: Theme, context: ToolRenderContext) => Component
    renderShell?: 'default' | 'self'
  }

  export type ExtensionEvent =
    | AgentEndEvent
    | AgentStartEvent
    | BeforeAgentStartEvent
    | ResourcesDiscoverEvent
    | SessionStartEvent
    | SessionShutdownEvent
    | ToolCallEvent
    | ToolExecutionStartEvent

  export type ResourcesDiscoverEvent = {
    cwd: string
    type?: 'resources_discover'
  }

  export type SessionStartEvent = {
    type?: 'session_start'
  }

  export type SessionShutdownEvent = {
    type?: 'session_shutdown'
  }

  export type AgentStartEvent = {
    type?: 'agent_start'
  }

  export type AgentEndEvent = {
    type?: 'agent_end'
  }

  export type ToolExecutionStartEvent = {
    args?: unknown
    toolCallId: string
    toolName: string
    type?: 'tool_execution_start'
  }

  export type Theme = {
    name?: string
    bold(value: string): string
    fg(name: string, value: string): string
  }

  export type ContextUsage = {
    contextWindow?: number
    percent?: number
    remainingPercent?: number
    tokens?: number
    usedPercent?: number
  }

  export type WorkingIndicatorOptions = {
    frames?: string[]
    intervalMs?: number
  }

  export type ReadonlyFooterDataProvider = {
    getExtensionStatuses(): Map<string, string>
    getGitBranch(): string | undefined
  }

  export class CustomEditor {
    constructor(tui: unknown, theme: unknown, keybindings: unknown, options?: unknown)
    borderColor(value: string): string
    getText(): string
    handleInput(data: string): void
    invalidate(): void
    render(width: number): string[]
  }

  export type KeybindingsManager = unknown

  export type AgentToolResult<T> = {
    content: Array<{ text?: string; type?: string }>
    details?: T
  }

  export type BashToolDetails = unknown
  export type EditToolDetails = { diff?: string }
  export type ToolRenderContext = { isError?: boolean }
  export type ToolRenderResultOptions = { expanded: boolean; isPartial: boolean }

  type BuiltInToolCallEvent<TName extends string, TInput extends Record<string, unknown>> = {
    input: TInput
    toolCallId?: string
    toolName: TName
    type?: 'tool_call'
  }

  export type ToolCallEvent =
    | BuiltInToolCallEvent<'bash', BashToolInput>
    | BuiltInToolCallEvent<'read', Record<string, unknown>>
    | BuiltInToolCallEvent<string, Record<string, unknown>>

  export type BashToolInput = {
    command: string
    timeout?: number
  }

  export const SessionManager: {
    inMemory(cwd: string): unknown
  }

  export type AgentSessionHandle = {
    dispose(): void
    prompt(prompt: string): Promise<void>
    subscribe(handler: (event: unknown) => void): void
  }

  export function createAgentSession(options: unknown): Promise<{
    session: AgentSessionHandle
  }>

  export function createBashTool(cwd: string): AgentTool<BashToolInput, BashToolDetails | undefined>
  export function createEditTool(cwd: string): AgentTool<Record<string, unknown>, EditToolDetails | undefined>
  export function createFindTool(cwd: string): AgentTool<Record<string, unknown>>
  export function createGrepTool(cwd: string): AgentTool<Record<string, unknown>>
  export function createLsTool(cwd: string): AgentTool<Record<string, unknown>>
  export function createReadTool(cwd: string): AgentTool<Record<string, unknown>>
  export function createWriteTool(cwd: string): AgentTool<Record<string, unknown>>
}

declare module '@earendil-works/pi-tui' {
  export type Component = {
    invalidate(): void
    render(...args: unknown[]): string[]
  }

  export type EditorTheme = unknown
  export type Focusable = {
    focused: boolean
    handleInput(data: string): void
  }
  export type Theme = {
    bold(value: string): string
    fg(name: string, value: string): string
  }
  export type TUI = unknown

  export type KeyId = string

  export const Key: {
    ctrlAlt(key: string): KeyId
    ctrlShift(key: string): KeyId
  }

  export class Text {
    constructor(text: string, x: number, y: number)
    invalidate(): void
    render(): string[]
  }

  export function truncateToWidth(value: string, width: number, suffix?: string): string
  export function visibleWidth(value: string): number
}
