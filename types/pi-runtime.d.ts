declare module '@earendil-works/pi-agent-core' {
  export type AgentMessage = {
    content: unknown
    role: string
  }
}

declare module '@earendil-works/pi-coding-agent' {
  export type BeforeAgentStartEvent = {
    systemPrompt: string
  }

  export type BeforeAgentStartEventResult = {
    systemPrompt: string
  }

  export type ExtensionContext = {
    cwd: string
    hasUI: boolean
    model?: {
      id?: string
      provider?: string
      thinking?: string
    }
    sessionManager: {
      getBranch(): unknown[]
    }
    getContextUsage?(): ContextUsage
    ui: {
      custom<T>(factory: (tui: unknown, theme: Theme, keybindings: unknown, done: (result: T) => void) => unknown, options?: unknown): Promise<T>
      getAllThemes(): Theme[]
      input(title: string, placeholder?: string): Promise<string>
      notify(message: string, level?: string): void
      setEditorComponent(factory: (tui: unknown, theme: any, keybindings: unknown) => unknown): void
      setFooter(factory: (tui: unknown, theme: Theme, footerData: ReadonlyFooterDataProvider) => unknown): void
      setStatus(key: string, value: string | undefined): void
      setTheme(themeName: string): { success: boolean }
      setWidget(key: string, factory: unknown, options?: unknown): void
      theme: Theme
      [key: string]: any
    }
  }

  export type ExtensionAPI = {
    appendEntry(customType: string, data: unknown): unknown
    exec(command: string, args: string[], options?: unknown): Promise<{ stdout?: string }>
    on(eventName: string, handler: (event: any, ctx: ExtensionContext) => unknown): void
    registerCommand(name: string, command: unknown): void
    registerShortcut(shortcut: unknown, command: unknown): void
    registerTool(tool: unknown): void
    sendMessage(message: unknown): void
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

  export type ReadonlyFooterDataProvider = {
    getExtensionStatuses(): Map<string, string>
    getGitBranch(): string | undefined
  }

  export class CustomEditor {
    constructor(tui: unknown, theme: unknown, keybindings: unknown, options?: unknown)
    borderColor(value: string): string
    getText(): string
    handleInput(data: string): void
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
  export type ToolRenderResultOptions = { expanded?: boolean; isPartial?: boolean }

  export type ToolCallEvent = {
    input: unknown
    toolName: string
  }

  export const SessionManager: {
    inMemory(cwd: string): unknown
  }

  export function createAgentSession(options: unknown): Promise<{
    session: {
      dispose(): void
      prompt(prompt: string): Promise<void>
      subscribe(handler: (event: unknown) => void): void
    }
  }>

  export function createBashTool(cwd: string): any
  export function createEditTool(cwd: string): any
  export function createFindTool(cwd: string): any
  export function createGrepTool(cwd: string): any
  export function createLsTool(cwd: string): any
  export function createReadTool(cwd: string): any
  export function createWriteTool(cwd: string): any
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

  export const Key: {
    ctrlAlt(key: string): unknown
    ctrlShift(key: string): unknown
  }

  export class Text {
    constructor(text: string, x: number, y: number)
  }

  export function truncateToWidth(value: string, width: number, suffix?: string): string
  export function visibleWidth(value: string): number
}
