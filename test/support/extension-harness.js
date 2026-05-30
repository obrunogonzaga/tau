const createUi = ({ notifications, statuses, widgets, theme, themes, inputs }) => ({
  getAllThemes: () => themes,
  input: async () => inputs.shift() ?? '',
  notify: (message, level) => {
    notifications.push({ level, message })
  },
  setStatus: (key, value) => {
    statuses.set(key, value)
  },
  setTheme: (name) => {
    const nextTheme = themes.find((candidate) => candidate.name === name)
    if (!nextTheme) return { success: false }

    theme.name = nextTheme.name
    return { success: true }
  },
  setWidget: (key, widget, options) => {
    widgets.set(key, { options, widget })
  },
  theme,
})

export const createExtensionHarness = ({ cwd = process.cwd(), inputs = [], themes = [] } = {}) => {
  const commands = new Map()
  const entries = []
  const events = new Map()
  const notifications = []
  const shortcuts = []
  const statuses = new Map()
  const theme = { name: themes[0]?.name }
  const widgets = new Map()

  const pi = {
    appendEntry: (customType, data) => {
      const entry = { customType, data, type: 'custom' }
      entries.push(entry)
      return entry
    },
    on: (eventName, handler) => {
      const handlers = events.get(eventName) ?? []
      handlers.push(handler)
      events.set(eventName, handlers)
    },
    registerCommand: (name, command) => {
      commands.set(name, command)
    },
    registerShortcut: (key, shortcut) => {
      shortcuts.push({ key, shortcut })
    },
    sendMessage: (message) => {
      entries.push({ ...message, type: 'custom_message' })
    },
  }

  const ctx = {
    cwd,
    hasUI: true,
    sessionManager: {
      getBranch: () => entries,
    },
    ui: createUi({ inputs, notifications, statuses, theme, themes, widgets }),
  }

  return {
    commands,
    ctx,
    entries,
    notifications,
    pi,
    shortcuts,
    statuses,
    theme,
    widgets,
    addMessage: (role, content) => {
      entries.push({ message: { content, role }, type: 'message' })
    },
    emit: (eventName, event = {}) => {
      let result
      for (const handler of events.get(eventName) ?? []) {
        result = handler(event, ctx) ?? result
      }
      return result
    },
    emitAsync: async (eventName, event = {}) => {
      let result
      for (const handler of events.get(eventName) ?? []) {
        result = (await handler(event, ctx)) ?? result
      }
      return result
    },
    runCommand: async (name, args = '') => {
      const command = commands.get(name)
      if (!command) throw new Error(`Command not registered: ${name}`)
      return command.handler(args, ctx)
    },
    runShortcut: async (index) => shortcuts[index].shortcut.handler(ctx),
  }
}
