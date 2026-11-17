#!/usr/bin/env node
// Starts the privalint MCP server from npm. npx is a .cmd file on Windows, which Node only runs
// through a shell, so the command is one fixed string without user input.
import { spawn } from 'node:child_process';

const child = spawn('npx -y privalint@latest mcp', {
  shell: true,
  stdio: 'inherit',
  windowsHide: true,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', (error) => {
  process.stderr.write(`privalint plugin: could not start npx: ${error.message}\n`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal === null ? 0 : 1));
});
