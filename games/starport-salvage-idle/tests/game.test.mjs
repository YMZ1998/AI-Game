import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_OFFLINE_SECONDS,
  advanceProduction,
  affordableCount,
  calculateOfflineReward,
  createInitialState,
  formatNumber,
  sanitizeState,
  upgradeCost,
} from "../public/game.js";

test("formats large resource values", () => {
  assert.equal(formatNumber(999), "999");
  assert.equal(formatNumber(1_200), "1.2K");
  assert.equal(formatNumber(2_500_000), "2.5M");
});

test("upgrade costs follow a 15 percent growth curve", () => {
  assert.equal(upgradeCost("salvage", 1, 1), 10);
  assert.equal(upgradeCost("refinery", 1, 1), 25);
  assert.equal(upgradeCost("logistics", 1, 1), 50);
  assert.equal(upgradeCost("salvage", 2, 1), 12);
  assert.equal(upgradeCost("salvage", 1, 2), 22);
});

test("max purchase never spends beyond available credits", () => {
  assert.equal(affordableCount("salvage", 1, 9), 0);
  assert.equal(affordableCount("salvage", 1, 21), 1);
  assert.equal(affordableCount("salvage", 1, 22), 2);
});

test("offline reward ignores time moving backwards", () => {
  const state = createInitialState(10_000);
  const reward = calculateOfflineReward(state, 5_000);
  assert.equal(reward.seconds, 0);
  assert.equal(reward.credits, 0);
});

test("offline reward is capped to four hours", () => {
  const state = createInitialState(0);
  state.lastSavedAt = 1;
  const reward = calculateOfflineReward(state, 100 * 60 * 60 * 1_000);
  assert.equal(reward.seconds, MAX_OFFLINE_SECONDS);
  assert.ok(reward.credits > 0);
});

test("save sanitizer rejects negative and non-finite resources", () => {
  const state = sanitizeState({
    resources: { credits: -10, scrap: Number.NaN, alloy: Number.POSITIVE_INFINITY },
    levels: { salvage: -3, refinery: 0, logistics: Number.NaN },
  });
  assert.equal(state.resources.credits, 0);
  assert.equal(state.resources.scrap, 0);
  assert.equal(state.resources.alloy, 0);
  assert.deepEqual(state.levels, { salvage: 1, refinery: 1, logistics: 1 });
});

test("production creates scrap and converts it without negative balances", () => {
  const state = createInitialState();
  advanceProduction(state, 2);
  assert.equal(state.resources.scrap, 1);
  assert.equal(state.resources.alloy, 1);
  advanceProduction(state, Number.NaN);
  assert.ok(Number.isFinite(state.resources.scrap));
  assert.ok(Number.isFinite(state.resources.alloy));
  assert.ok(state.resources.scrap >= 0);
});
