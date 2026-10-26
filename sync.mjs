#!/usr/bin/env node
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { discordStatus, setDiscordStatus } from './discord.mjs';
import { Policy } from './policy.mjs';
import { runtime, socketPath } from './paths.mjs';
const exec = promisify(execFile);
const steamHelper = fileURLToPath(new URL('./steam-hide', import.meta.url));
const stateDirectory = path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local/state'), 'presence-hide');
const stateFile = path.join(stateDirectory, 'state.json');
let savedTarget = null;
try {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  if (typeof state.invisible === 'boolean') savedTarget = state.invisible;
} catch {}
const policy = new Policy(savedTarget);
let snapshot = { steam: null, discord: null, target: null, pending: false, error: '' };
let lastError = '';
let serial = Promise.resolve();
let stopped = false;
const enqueue = fn => {
  const next = serial.then(fn);
  serial = next.catch(error => console.error(error.message));
  return next;
};
async function steamStatus() {
  try {
    const { stdout } = await exec(steamHelper, ['status'], { timeout: 2500 });
    const [running, state] = stdout.trim().split(/\s+/).map(Number);
    return running === 1 && state >= 0 ? (state === 7 ? 'invisible' : 'online') : null;
  } catch { return null; }
}
export async function refresh() {
  const [steam, discord] = await Promise.all([steamStatus(), discordStatus()]);
  const binary = value => value === null ? null : value === 'invisible';
  const { actions, errors } = policy.observe({ steam: binary(steam), discord: binary(discord) });
  for (const action of actions) {
    const status = action.invisible ? 'invisible' : 'online';
    try {
      if (action.name === 'steam') await exec(steamHelper, [status], { timeout: 3000 });
      else await setDiscordStatus(status);
      console.log(`${action.name}: ${status}${action.name === 'discord' && action.invisible ? ' (Forever)' : ''}`);
      lastError = '';
    } catch (error) {
      // Busy menus are retried on the next poll without reinterpreting an old
      // status as a user request. Other failures remain visible until a retry.
      if (/menu busy/.test(error.message)) {
        delete policy.pending[action.name];
        policy.force.add(action.name);
      } else {
        policy.retry(action.name);
        lastError = `${action.name}: ${error.message}`;
        console.error(lastError);
      }
    }
  }
  if (policy.target !== null && policy.target !== savedTarget) {
    await fs.mkdir(stateDirectory, {recursive: true, mode: 0o700});
    await fs.writeFile(stateFile + '.tmp', JSON.stringify({invisible: policy.target}) + '\n', {mode: 0o600});
    await fs.rename(stateFile + '.tmp', stateFile);
    savedTarget = policy.target;
  }
  if (errors.length) lastError = errors.join('; ');
  snapshot = {
    steam, discord, target: policy.target === null ? null : policy.target ? 'invisible' : 'online',
    pending: Object.keys(policy.pending).length > 0,
    error: lastError || (discord === null ? 'Discord bridge unavailable (open Discord using its launcher)' : ''),
  };
  return snapshot;
}
await fs.mkdir(runtime, { recursive: true, mode: 0o700 });
// The service owns this runtime directory. Refuse a second active daemon.
try {
  await new Promise((resolve, reject) => {
    const probe = net.createConnection(socketPath);
    probe.once('connect', () => { probe.end(); resolve(); });
    probe.once('error', reject);
  });
  throw new Error('Presence Hide is already running');
} catch (error) {
  if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error;
  await fs.rm(socketPath, { force: true });
}
const server = net.createServer(connection => {
  connection.setTimeout(30000, () => connection.destroy());
  let input = '';
  connection.on('data', chunk => {
    input += chunk;
    if (input.length > 100) return connection.destroy();
    if (!input.includes('\n')) return;
    connection.removeAllListeners('data');
    const command = input.trim();
    if (command === 'status') { connection.end(JSON.stringify(snapshot) + '\n'); return; }
    enqueue(async () => {
      if (!['toggle', 'online', 'invisible', 'refresh'].includes(command)) throw new Error('Invalid command');
      if (command !== 'refresh') {
        policy.request(command === 'toggle' ? policy.target !== true : command === 'invisible');
        lastError = '';
      }
      return await refresh();
    }).then(result => connection.end(JSON.stringify(result) + '\n'))
      .catch(error => connection.end(JSON.stringify({ ...snapshot, error: error.message }) + '\n'));
  });
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
await fs.chmod(socketPath, 0o600);
await enqueue(refresh);
async function tick() {
  if (stopped) return;
  await enqueue(refresh);
  if (!stopped) setTimeout(tick, 2000);
}
setTimeout(tick, 2000);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopped = true;
  server.close();
  fs.rm(socketPath, { force: true }).finally(() => process.exit(0));
});
