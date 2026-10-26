import { CDP } from './cdp.mjs';
import { setTimeout as delay } from 'node:timers/promises';

// Only inspect the current user's avatar inside the account panel. Never
// inspect messages, storage, authentication, webpack modules, or network APIs.
export const readStatus = `(() => {
  const panel = document.querySelector('section[class*="panels_"]');
  if (!panel) return null;
  const text = panel.querySelector('[class*=panelSubtextContainer_] [class*=default_]')?.textContent?.trim();
  const labels = {Online:'online', Idle:'idle', 'Do Not Disturb':'dnd', Invisible:'invisible'};
  if (labels[text]) return labels[text];
  const dot = panel.querySelector('[mask*="svg-mask-status-"]');
  const match = dot?.getAttribute('mask')?.match(/svg-mask-status-(online|idle|dnd|offline)/);
  return match ? (match[1] === 'offline' ? 'invisible' : match[1]) : null;
})()`;

export async function discordStatus() {
  let cdp;
  try {
    cdp = await CDP.connect();
    return await cdp.evaluate(readStatus);
  } catch { return null; }
  finally { cdp?.close(); }
}

export async function setDiscordStatus(status) {
  if (!['online', 'invisible'].includes(status)) throw new Error('Invalid Discord status');
  const cdp = await CDP.connect();
  let opened = false;
  try {
    const current = await cdp.evaluate(readStatus);
    if (!current) throw new Error('Discord account panel not available');
    if (current === status && status === 'online') return;
    // Defer while the user has an unrelated menu/modal open. No keystrokes,
    // coordinates, focus changes, or closing the user's dialogs.
    const result = await cdp.evaluate(`(() => {
      const button = document.querySelector('[class*="accountPopoutButton_"]');
      if (!button) return 'missing';
      if (button.getAttribute('aria-expanded') === 'true' || document.querySelector('[role="menu"],[role="dialog"]')) return 'busy';
      button.click(); return 'opened';
    })()`);
    if (result !== 'opened') throw new Error(`Discord profile menu ${result}`);
    opened = true;
    for (let i = 0; i < 10; i++) {
      const ready = await cdp.evaluate(`(() => {
        const popout = document.querySelector('[class*="accountPopout_"]');
        const button = [...(popout?.querySelectorAll('[role="button"]') || [])]
          .find(e => e.querySelector('[mask*="svg-mask-status-"]'));
        if (!button) return false;
        if (button.getAttribute('aria-expanded') !== 'true') button.click();
        return true;
      })()`);
      if (ready) break;
      await delay(100);
    }
    let clicked = false;
    for (let i = 0; i < 10; i++) {
      clicked = await cdp.evaluate(`(() => {
        const item = document.getElementById('set-status-submenu-${status}')
          || document.getElementById('status-picker-${status}');
        if (!item) return false;
        item.click();
        return true;
      })()`);
      if (clicked) break;
      await delay(100);
    }
    if (!clicked) throw new Error('Discord status menu changed; selectors need updating');
    if (status === 'invisible') {
      // Duration submenu applies to the current status: select Invisible
      // first, then open its submenu and explicitly choose Forever.
      await delay(300);
      await cdp.evaluate(`document.getElementById('set-status-submenu-invisible')?.dispatchEvent(new MouseEvent('mouseover', {bubbles:true}))`);
      let forever = false;
      for (let i = 0; i < 15; i++) {
        forever = await cdp.evaluate(`(() => {
          const item = document.getElementById('set-status-submenu-invisible--invisible-undefined');
          if (!item || item.textContent.trim() !== 'Forever') return false;
          item.click(); return true;
        })()`);
        if (forever) break;
        await delay(100);
      }
      if (!forever) throw new Error('Discord Forever duration not found; refusing a timed invisible status');
    }
    await delay(500);
    for (let i = 0; i < 15; i++) {
      if (await cdp.evaluate(readStatus) === status) return;
      await delay(100);
    }
    throw new Error('Discord did not confirm the selected status');
  } finally {
    if (opened) {
      // Only dismiss the account popout we opened, if it is still open.
      await cdp.evaluate(`(() => {
        const button = document.querySelector('[class*="accountPopoutButton_"]');
        if (button?.getAttribute('aria-expanded') === 'true') button.click();
      })()`).catch(() => {});
    }
    cdp.close();
  }
}
