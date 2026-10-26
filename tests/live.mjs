// Opt-in: changes both live app statuses, finishes invisible. Run: node tests/live.mjs
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {discordStatus,setDiscordStatus} from '../discord.mjs';
const exec=promisify(execFile);
const repo = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const cli=async command=>JSON.parse((await exec(repo+'/presence-hide',[command])).stdout);
async function waitBoth(status,label) {
  for(let n=0;n<20;n++) {
    const s=await cli('status');
    if(s.steam===status && (status==='online'?s.discord==='online':s.discord==='invisible') && !s.pending && !s.error) {
      console.log('PASS '+label+': '+JSON.stringify(s));return;
    }
    await delay(1000);
  }
  throw new Error(label+': '+JSON.stringify(await cli('status')));
}
try {
  await cli('online');await waitBoth('online','shared online command');
  await exec(repo+'/steam-hide',['invisible']);await waitBoth('invisible','Steam invisible -> Discord Forever');
  await exec(repo+'/steam-hide',['online']);await waitBoth('online','Steam online -> Discord online');
  await setDiscordStatus('invisible');await waitBoth('invisible','Discord Invisible Forever -> Steam invisible');
  await setDiscordStatus('online');await waitBoth('online','Discord online -> Steam online');
  await exec('omarchy-shell',['io.github.thisisrinesi.presence-hide','toggle']);await waitBoth('invisible','bar widget IPC toggles both');
} finally {
  await cli('invisible');await waitBoth('invisible','final state Invisible Forever');
}
