#!/usr/bin/env node
// PostToolUse hook for Edit / Write / MultiEdit (wired in .claude/settings.json).
// Never blocks: appends "time<TAB>tool<TAB>path" to .claude/hooks/write.log (git-ignored) and exits 0.
import { appendFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
  const ti = input?.tool_input ?? {}
  const file = ti.file_path ?? ti.notebook_path
  if (file) {
    const log = fileURLToPath(new URL('./write.log', import.meta.url))
    appendFileSync(log, `${new Date().toISOString()}\t${input.tool_name ?? '?'}\t${file}\n`)
  }
} catch {
  /* logging must never fail the tool call */
}
process.exit(0)
