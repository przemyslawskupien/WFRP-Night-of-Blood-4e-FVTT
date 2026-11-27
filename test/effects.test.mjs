import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScripts } from '../tools/content-migration.mjs';
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
test('Armour adds natural armour once and respects damage without negative AP', () => {
  const args = { AP: Object.fromEntries(['head', 'rArm', 'lArm', 'body', 'lLeg', 'rLeg'].map(k => [k, { value: 1 }])) };
  new Function('args', effectScripts.Armour.script).call({ item: { system: { specification: { value: '2' } }, getFlag: () => ({ head: 1, body: 5 }) } }, args);
  assert.equal(args.AP.head.value, 2); assert.equal(args.AP.body.value, 1); assert.equal(args.AP.rArm.value, 3);
});
test('Arboreal modifies Climb and Stealth, leaves other rolls alone', () => {
  const context = { actor: { system: { characteristics: { ag: { bonus: 4 } } } } };
  for (const [name, expected] of [['Climb', 5], ['Stealth (Rural)', 5], ['Dodge', 1], [undefined, 1]]) {
    const args = { skill: name ? { name } : undefined, fields: { slBonus: 1 } };
    new Function('args', effectScripts.Arboreal.script).call(context, args);
    assert.equal(args.fields.slBonus, expected);
    assert.equal(new Function('args', effectScripts.Arboreal.options.activateScript)(args), expected === 5);
    assert.equal(new Function('args', effectScripts.Arboreal.options.hideScript)(args), expected !== 5);
  }
});
test('Fear targets actors as GM, otherwise creates the modern psychology message', async () => {
  const calls = [];
  const game = { user: { isGM: true, targets: new Set([{ actor: { applyFear: async (...args) => calls.push(args) } }]), updateTokenTargets: async args => calls.push(args) } };
  const CONFIG = { ChatMessage: { dataModels: { psych: { createFearMessage: async (...args) => calls.push(['chat', ...args]) } } } };
  const run = new AsyncFunction('args', 'game', 'CONFIG', effectScripts.Fear.script);
  const context = { item: { system: { specification: { value: '2' } } }, actor: { name: 'Daemon', prototypeToken: { name: 'Horror' } } };
  await run.call(context, {}, game, CONFIG);
  assert.deepEqual(calls, [[2, 'Horror'], []]);
  calls.length = 0; game.user.targets.clear();
  await run.call(context, {}, game, CONFIG);
  assert.deepEqual(calls, [['chat', 2, 'Horror']]);
});
