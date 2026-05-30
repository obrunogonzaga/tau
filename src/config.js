import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const hasText = (value) => typeof value === 'string' && value.length > 0

const validateProfile = (name, profile, profiles) => {
  if (!profile || typeof profile !== 'object') {
    throw new Error(`Invalid config: profile ${name} must be an object`)
  }
  if (profile.id !== undefined) {
    if (!hasText(profile.id) || !profile.id.includes('/')) {
      throw new Error(`Invalid config: profile ${name} id must be <provider>/<model>`)
    }
    if (!hasText(profile.thinking)) {
      throw new Error(`Invalid config: profile ${name} requires thinking`)
    }
  }
  if (profile.models?.some((modelName) => !profiles[modelName])) {
    throw new Error(`Invalid config: profile ${name} has unknown model reference`)
  }
}

const validateAlias = (name, alias, profiles) => {
  if (!alias || !profiles[alias.profile] || !Array.isArray(alias.extras)) {
    throw new Error(`Invalid config: alias ${name} requires profile and extras`)
  }
}

const validateExtensionPreset = (name, preset, profiles) => {
  if (!preset || !profiles[preset.profile] || !Array.isArray(preset.extensions)) {
    throw new Error(`Invalid config: extension preset ${name} requires profile and extensions`)
  }
  if (preset.extensions.some((extension) => !hasText(extension))) {
    throw new Error(`Invalid config: extension preset ${name} has invalid extension`)
  }
  if (preset.prompt !== undefined && !hasText(preset.prompt)) {
    throw new Error(`Invalid config: extension preset ${name} has invalid prompt`)
  }
  if (preset.themes !== undefined && (!Array.isArray(preset.themes) || preset.themes.some((theme) => !hasText(theme)))) {
    throw new Error(`Invalid config: extension preset ${name} has invalid themes`)
  }
  if (preset.brand !== undefined && !hasText(preset.brand)) {
    throw new Error(`Invalid config: extension preset ${name} has invalid brand`)
  }
}

export const validateConfig = (config) => {
  if (!config?.profiles || !config?.aliases || !config?.extensionPresets || !hasText(config.defaultProfile)) {
    throw new Error('Invalid config: profiles, aliases, extensionPresets, and defaultProfile are required')
  }
  if (!config.profiles[config.defaultProfile]) throw new Error('Invalid config: defaultProfile unknown')
  Object.entries(config.profiles).forEach(([name, profile]) => validateProfile(name, profile, config.profiles))
  Object.entries(config.aliases).forEach(([name, alias]) => validateAlias(name, alias, config.profiles))
  Object.entries(config.extensionPresets).forEach(([name, preset]) =>
    validateExtensionPreset(name, preset, config.profiles),
  )
}

export const localConfigPath = () =>
  process.env.TAU_LOCAL_CONFIG || path.join(os.homedir(), '.pi', 'tau', 'config.local.json')

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

export const deepMerge = (base, overlay) => {
  if (!isPlainObject(base) || !isPlainObject(overlay)) return overlay
  const merged = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    merged[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value
  }
  return merged
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

export const loadConfig = (configPath) => {
  try {
    let config = readJson(configPath)
    const overlayPath = localConfigPath()
    if (fs.existsSync(overlayPath)) config = deepMerge(config, readJson(overlayPath))
    validateConfig(config)
    return config
  } catch (error) {
    if (error.message.startsWith('Invalid config')) throw error
    throw new Error(`Invalid config: ${error.message}`)
  }
}
