import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Policy } from '../policy.mjs';

test('startup disagreement chooses invisible and normalizes Discord duration', () => {
  const p = new Policy();
  assert.deepEqual(p.observe({steam:true,discord:false},0).actions, [{name:'discord',invisible:true}]);
  assert.equal(p.target,true);
});
test('Discord changes propagate to Steam and confirmation cannot echo back', () => {
  const p = new Policy(); p.observe({steam:false,discord:false},0);
  assert.deepEqual(p.observe({steam:false,discord:true},1).actions, [
    {name:'steam',invisible:true},{name:'discord',invisible:true},
  ]);
  assert.deepEqual(p.observe({steam:false,discord:true},2).actions, []);
  assert.equal(p.target,true);
  p.observe({steam:true,discord:true},3);
  assert.deepEqual(p.observe({steam:true,discord:false},4).actions, [{name:'steam',invisible:false}]);
});
test('Steam manual changes propagate to Discord', () => {
  const p = new Policy(); p.observe({steam:false,discord:false},0);
  assert.deepEqual(p.observe({steam:true,discord:false},1).actions, [{name:'discord',invisible:true}]);
  p.observe({steam:true,discord:true},2);
  assert.deepEqual(p.observe({steam:false,discord:true},3).actions, [{name:'discord',invisible:false}]);
});
test('reopened app adopts existing target, missing app never changes privacy', () => {
  const p = new Policy(); p.observe({steam:true,discord:true},0);
  p.observe({steam:true,discord:true},1);
  p.observe({steam:null,discord:true},2);
  assert.equal(p.target,true);
  assert.deepEqual(p.observe({steam:false,discord:true},3).actions,[{name:'steam',invisible:true}]);
});
test('confirmation timeout reports an error without exposing the other client', () => {
  const p = new Policy(); p.observe({steam:false,discord:false},0);
  p.observe({steam:true,discord:false},1);
  const result=p.observe({steam:true,discord:false},21000);
  assert.equal(result.errors.length,1);
  assert.equal(p.target,true);
  assert.deepEqual(result.actions,[]);
});
test('widget request supersedes pending changes; simultaneous changes prefer invisible', () => {
  const p = new Policy(); p.observe({steam:false,discord:true},0);
  p.observe({steam:true,discord:true},1);
  p.request(false);
  assert.deepEqual(p.observe({steam:true,discord:true},2).actions,[{name:'steam',invisible:false},{name:'discord',invisible:false}]);
  p.observe({steam:false,discord:false},3);
  // Use a deliberately mismatched baseline to exercise both changed values.
  p.last={steam:false,discord:true};
  p.observe({steam:true,discord:false},4);
  assert.equal(p.target,true);
});

test('remembered invisible survives service restart and late app startup', () => {
  const p = new Policy(true);
  assert.deepEqual(p.observe({steam:false,discord:null},0).actions,[{name:'steam',invisible:true}]);
  p.observe({steam:true,discord:null},1);
  assert.deepEqual(p.observe({steam:true,discord:false},2).actions,[{name:'discord',invisible:true}]);
});

test('startup invisible overrides a remembered visible setting', () => {
  const p = new Policy(false);
  assert.deepEqual(p.observe({steam:false,discord:true},0).actions,[{name:'steam',invisible:true},{name:'discord',invisible:true}]);
  assert.equal(p.target,true);
});

test('explicit command wins over a not-yet-observed external change',()=>{
  const p = new Policy(); p.observe({steam:false,discord:false},0);
  p.request(false);
  assert.deepEqual(p.observe({steam:true,discord:true},1).actions,[{name:'steam',invisible:false},{name:'discord',invisible:false}]);
  assert.equal(p.target,false);
});
