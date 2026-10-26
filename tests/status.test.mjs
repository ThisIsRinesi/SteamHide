import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readStatus} from '../discord.mjs';
function read(text,mask) {
  const panel={querySelector(selector) {
    return selector.includes('panelSubtext') ? {textContent:text} : mask ? {getAttribute:()=>mask} : null;
  }};
  return vm.runInNewContext(readStatus,{document:{querySelector:()=>panel}});
}
test('own-account status supports Discord animated indicators and static masks',()=>{
  assert.equal(read('Invisible',null),'invisible');
  assert.equal(read('Online',null),'online');
  assert.equal(read('Idle',null),'idle');
  assert.equal(read('Do Not Disturb',null),'dnd');
  assert.equal(read('custom status','url(#svg-mask-status-online)'),'online');
  assert.equal(read('custom status','url(#svg-mask-status-offline)'),'invisible');
  assert.equal(read('custom status',null),null);
});
test('missing account panel produces unknown, never invisible',()=>{
  assert.equal(vm.runInNewContext(readStatus,{document:{querySelector:()=>null}}),null);
});
