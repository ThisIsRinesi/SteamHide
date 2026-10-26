import path from 'node:path';
export const runtime = path.join(process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`, 'presence-hide');
export const socketPath = path.join(runtime, 'control.sock');
