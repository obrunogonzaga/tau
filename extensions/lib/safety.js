import path from 'node:path'

export const SENSITIVE_KEY = /(token|secret|password|auth|credential|api[_-]?key|access[_-]?token|bearer|[a-z0-9_]*_token)$/i
export const SECRET_TEXT_PATTERN = /(sk-|sk-proj-|pk_live_|ghp_|gho_|ghu_|github_pat_)[A-Za-z0-9_+-]{16,}/
export const SECRET_FILE_PATTERN = /(^|\/)(\.env|\.npmrc|\.netrc|auth|token|secret|credentials|key|history|sessions?|logs?|cache)(\.|\/|$)/i
export const SAFE_EXTENSIONS = new Set(['.md', '.markdown', '.yaml', '.yml', '.json'])
export const BLOCKED_DIRS = ['/node_modules/', '/.git/', '/.ssh/', '/.aws/', '/.gnupg/', '/.cache/', '/Library/', '/AppData/']

export const redactValue = (value, key = '') => {
  if (typeof value === 'string') {
    if (SENSITIVE_KEY.test(key) || SECRET_TEXT_PATTERN.test(value)) return '[redacted]'
    return value
  }

  if (Array.isArray(value)) return value.map((entry) => redactValue(entry))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [entryKey, entryValue] of Object.entries(value)) {
      out[entryKey] = SENSITIVE_KEY.test(entryKey) ? '[redacted]' : redactValue(entryValue, entryKey)
    }
    return out
  }

  return value
}

export const isSecretLikeText = (value) => typeof value === 'string' && SECRET_TEXT_PATTERN.test(value)

export const isBlockedPath = (filePath) => BLOCKED_DIRS.some((segment) => filePath.includes(segment))

export const isSensitivePath = (filePath, extraRules = []) => {
  if (!filePath) return false
  return SECRET_FILE_PATTERN.test(filePath) || extraRules.some((rule) => rule.test(filePath))
}

export const isSafeCrossAgentFile = (filePath) => {
  if (isSensitivePath(filePath)) return false
  if (isBlockedPath(filePath)) return false

  return SAFE_EXTENSIONS.has(path.extname(filePath))
}
