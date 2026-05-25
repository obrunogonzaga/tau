#!/usr/bin/env node
import { spawn } from 'node:child_process'

const child = spawn('pi', process.argv.slice(2), { stdio: 'inherit' })

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
