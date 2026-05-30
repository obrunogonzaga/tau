import path from 'node:path'

export const splitModelId = (modelId) => {
  const slash = modelId.indexOf('/')

  return { provider: modelId.slice(0, slash), model: modelId.slice(slash + 1) }
}

const modelPattern = (modelConfig) => `${modelConfig.id}:${modelConfig.thinking}`

const profileBaseArgs = (modelConfig) => {
  if (!modelConfig.id) return []

  const { model, provider } = splitModelId(modelConfig.id)
  return ['--provider', provider, '--model', model, '--thinking', modelConfig.thinking]
}

const profileArgs = (config, profileName) => {
  const profileConfig = config.profiles[profileName]
  const modelNames = profileConfig.models ?? []
  const modelArgs = modelNames.length === 0
    ? []
    : ['--models', modelNames.map((name) => modelPattern(config.profiles[name])).join(',')]

  return [...profileBaseArgs(profileConfig), ...modelArgs]
}

const extensionArgs = (repoDir, extensions) => extensions.flatMap((extension) => ['-e', path.resolve(repoDir, 'extensions', extension)])

const themeArgs = (repoDir, themes) => themes.flatMap((theme) => ['--theme', path.resolve(repoDir, '.pi', 'themes', `${theme}.json`)])

const extractProfileAt = (config, args, profileIndex) => {
  const profileArg = args[profileIndex]
  const hasEqualsValue = profileArg.startsWith('--profile=')
  const profileName = hasEqualsValue ? profileArg.slice('--profile='.length) : args[profileIndex + 1]
  if (!profileName) throw new Error('Missing value for --profile')
  if (!config.profiles[profileName]) throw new Error(`Unknown profile: ${profileName}`)

  const cleanArgs = args.filter((_, index) => {
    if (index === profileIndex) return false
    return hasEqualsValue || index !== profileIndex + 1
  })

  return { args: cleanArgs, profileName }
}

const extractProfile = (config, args) => {
  if (args[0] === '--profile' || args[0]?.startsWith('--profile=')) return extractProfileAt(config, args, 0)
  if (config.aliases[args[0]] && (args[1] === '--profile' || args[1]?.startsWith('--profile='))) {
    return extractProfileAt(config, args, 1)
  }

  return { args, profileName: null }
}

export const appendSystemPrompt = (args, promptText) => ['--append-system-prompt', promptText, ...args]

export const resolveArgs = (config, rawInputArgs, options) => {
  const { repoDir, shouldAppendPrompt } = options
  const { args: inputArgs, profileName } = extractProfile(config, rawInputArgs)
  const [firstArg, ...restArgs] = inputArgs

  if (!firstArg) {
    const selectedProfile = profileName ?? config.defaultProfile

    return {
      args: [...profileArgs(config, selectedProfile), ...extensionArgs(repoDir, ['tau-banner.ts'])],
      profileName: selectedProfile,
    }
  }

  if (firstArg === 'ext') {
    const [presetName, ...presetRestArgs] = restArgs
    const preset = config.extensionPresets[presetName]
    if (!preset) throw new Error(`Unknown extension preset: ${presetName ?? ''}`)
    const selectedProfile = profileName ?? preset.profile
    const promptArgs = shouldAppendPrompt && preset.prompt ? ['--append-system-prompt', preset.prompt] : []

    return {
      args: [
        ...profileArgs(config, selectedProfile),
        ...themeArgs(repoDir, preset.themes ?? []),
        ...extensionArgs(repoDir, preset.extensions),
        ...promptArgs,
        ...presetRestArgs,
      ],
      profileName: selectedProfile,
      brand: preset.brand,
    }
  }

  if (config.aliases[firstArg]) {
    const alias = config.aliases[firstArg]
    const selectedProfile = profileName ?? alias.profile
    const promptArgs = shouldAppendPrompt && alias.prompt ? ['--append-system-prompt', alias.prompt] : []

    return {
      args: [...profileArgs(config, selectedProfile), ...alias.extras, ...promptArgs, ...restArgs],
      profileName: selectedProfile,
    }
  }

  const resolvedProfileName = profileName ?? firstArg
  if (!config.profiles[resolvedProfileName]) {
    return {
      args: [...profileArgs(config, config.defaultProfile), firstArg, ...restArgs].filter((arg) => arg !== undefined),
      profileName: config.defaultProfile,
    }
  }

  return {
    args: [...profileArgs(config, resolvedProfileName), ...(profileName ? inputArgs : restArgs)],
    profileName: resolvedProfileName,
  }
}
