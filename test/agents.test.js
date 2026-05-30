import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { repoDir } from './support/wrapper.js'
import { agentNames, parseChainAgents, parseYamlListBlock, readProjectYaml } from './support/project-yaml.js'

test('tau_specialistAgents_existWithRequiredSections', () => {
  for (const name of agentNames) {
    const agentPath = path.join(repoDir, '.pi', 'agents', `${name}.md`)
    const content = fs.readFileSync(agentPath, 'utf8')

    assert.match(content, /^## Role$/m, name)
    assert.match(content, /^## Limits$/m, name)
    assert.match(content, /^## Work Mode$/m, name)
    assert.match(content, /^## Output$/m, name)
  }
})

test('tau_specialistAgents_keepScoutAndPlannerNoEdit', () => {
  for (const name of ['scout', 'planner']) {
    const content = fs.readFileSync(path.join(repoDir, '.pi', 'agents', `${name}.md`), 'utf8')

    assert.match(content, /no-edit/i, name)
    assert.match(content, /do not edit/i, name)
  }
})

test('tau_teamDefinitions_referenceExistingAgents', () => {
  const teams = readProjectYaml('.pi/agents/teams.yaml')
  const expectedTeams = ['frontend', 'full', 'info', 'plan-build', 'security']

  for (const team of expectedTeams) {
    const members = parseYamlListBlock(teams, team)

    assert.notEqual(members.length, 0, team)
    for (const member of members) assert.equal(agentNames.includes(member), true, `${team}:${member}`)
  }
})

test('tau_chainDefinitions_referenceExistingAgentsAndPromptTemplates', () => {
  const chains = readProjectYaml('.pi/agents/agent-chain.yaml')
  const expectedChains = ['plan-build-review', 'plan-review-plan', 'scout-plan-build-review']

  for (const chain of expectedChains) {
    const members = parseChainAgents(chains, chain)

    assert.notEqual(members.length, 0, chain)
    for (const member of members) assert.equal(agentNames.includes(member), true, `${chain}:${member}`)
  }
  assert.match(chains, /\$INPUT/)
  assert.match(chains, /\$ORIGINAL/)
})
