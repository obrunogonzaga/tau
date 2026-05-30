const createUi = (notifications) => ({
  notify: (message, level) => {
    notifications.push({ level, message })
  },
  setStatus: () => {},
  setWidget: () => {},
})

export const createExtensionHarness = ({ cwd = process.cwd() } = {}) => {
  const commands = new Map()
  const entries = []
  const events = new Map()
  const notifications = []

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
    registerShortcut: () => {},
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
    ui: createUi(notifications),
  }

  return {
    commands,
    ctx,
    entries,
    notifications,
    pi,
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
    runCommand: async (name, args = '') => {
      const command = commands.get(name)
      if (!command) throw new Error(`Command not registered: ${name}`)
      return command.handler(args, ctx)
    },
  }
}
