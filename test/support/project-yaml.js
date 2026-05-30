import fs from 'node:fs'
import path from 'node:path'

import { repoDir } from './wrapper.js'

export const agentNames = ['builder', 'documenter', 'plan-reviewer', 'planner', 'red-team', 'reviewer', 'scout']

export const readProjectYaml = (filePath) => fs.readFileSync(path.join(repoDir, filePath), 'utf8')

export const parseYamlListBlock = (content, name) => {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => line === '  ' + name + ':')
  if (start === -1) return []
  const block = []
  for (const line of lines.slice(start + 1)) {
    if (/^  \S/.test(line)) break
    block.push(line)
  }

  return block.map((line) => line.match(/^    - ([a-z-]+)$/)?.[1]).filter(Boolean)
}

export const parseChainAgents = (content, name) => {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => line === '  ' + name + ':')
  if (start === -1) return []
  const block = []
  for (const line of lines.slice(start + 1)) {
    if (/^  \S/.test(line)) break
    block.push(line)
  }

  return block.map((line) => line.match(/^      - agent: ([a-z-]+)$/)?.[1]).filter(Boolean)
}
