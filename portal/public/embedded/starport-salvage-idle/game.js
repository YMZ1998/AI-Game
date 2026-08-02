export const SAVE_KEY = "starport-salvage-idle:v1";
export const SAVE_VERSION = 1;
export const MAX_OFFLINE_SECONDS = 4 * 60 * 60;
export const OFFLINE_EFFICIENCY = 0.7;

const UPGRADE_BASE_COSTS = {
  salvage: 10,
  refinery: 25,
  logistics: 50,
};

const ORDER_TEMPLATES = [
  { name: "导航中继器", icon: "◇", requirement: 8 },
  { name: "护盾蒙皮", icon: "⬢", requirement: 18 },
  { name: "跃迁线圈", icon: "◎", requirement: 30 },
];

const clampFinite = (value, minimum = 0, fallback = minimum) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, number) : fallback;
};

export function formatNumber(value) {
  const number = clampFinite(value);
  if (number < 1_000) {
    return number >= 100 ? Math.floor(number).toString() : number.toFixed(number < 10 ? 1 : 0).replace(/\.0$/, "");
  }

  const units = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];

  const [divisor, suffix] = units.find(([threshold]) => number >= threshold);
  const digits = number / divisor >= 100 ? 0 : number / divisor >= 10 ? 1 : 2;
  return `${(number / divisor).toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")}${suffix}`;
}

export function upgradeCost(type, currentLevel, count = 1) {
  const base = UPGRADE_BASE_COSTS[type];
  if (!base) return Infinity;

  const level = Math.max(1, Math.floor(clampFinite(currentLevel, 1, 1)));
  const amount = Math.max(0, Math.floor(clampFinite(count)));
  let total = 0;

  for (let index = 0; index < amount; index += 1) {
    total += base * 1.15 ** (level - 1 + index);
  }

  return Math.ceil(total);
}

export function affordableCount(type, currentLevel, credits, requested = Infinity) {
  const balance = clampFinite(credits);
  const limit = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 10_000;
  let spent = 0;
  let count = 0;

  while (count < limit) {
    const next = upgradeCost(type, currentLevel + count, 1);
    if (!Number.isFinite(next) || spent + next > balance) break;
    spent += next;
    count += 1;
  }

  return count;
}

export function calculateRates(state) {
  const salvageLevel = Math.max(1, Math.floor(clampFinite(state?.levels?.salvage, 1, 1)));
  const refineryLevel = Math.max(1, Math.floor(clampFinite(state?.levels?.refinery, 1, 1)));
  const logisticsLevel = Math.max(1, Math.floor(clampFinite(state?.levels?.logistics, 1, 1)));

  return {
    clickYield: 1 + Math.floor((salvageLevel - 1) * 0.5),
    salvagePerSecond: salvageLevel,
    refineryPerSecond: refineryLevel * 0.5,
    logisticsMultiplier: 1 + (logisticsLevel - 1) * 0.15,
    deliverySeconds: Math.max(3, 12 / (1 + (logisticsLevel - 1) * 0.08)),
  };
}

function makeOrder(index, logisticsLevel = 1, seed = Date.now()) {
  const template = ORDER_TEMPLATES[Math.abs(index) % ORDER_TEMPLATES.length];
  const scale = 1 + Math.max(0, logisticsLevel - 1) * 0.04;
  const requirement = Math.max(5, Math.round(template.requirement * scale));
  const gold = (Math.abs(Math.floor(seed / 113)) + index) % 9 === 0;
  const multiplier = 1 + Math.max(0, logisticsLevel - 1) * 0.15;
  const reward = Math.round(requirement * (gold ? 4.5 : 3) * multiplier);

  return {
    id: `${seed}-${index}-${Math.floor(Math.random() * 1_000_000)}`,
    name: gold ? `黄金·${template.name}` : template.name,
    icon: template.icon,
    requirement,
    reward,
    gold,
  };
}

export function createOrders(logisticsLevel = 1, seed = Date.now()) {
  return [0, 1, 2].map((index) => makeOrder(index, logisticsLevel, seed + index * 12_347));
}

export function createInitialState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    resources: { credits: 60, scrap: 0, alloy: 0 },
    levels: { salvage: 1, refinery: 1, logistics: 1 },
    orders: createOrders(1, now),
    activeDelivery: null,
    buyMode: 1,
    tutorial: { step: 0, taps: 0, observationStartedAt: 0 },
    settings: { music: false, sfx: true },
    refresh: { freeUsed: false, readyAt: 0 },
    lastSavedAt: now,
  };
}

export function sanitizeState(raw, now = Date.now()) {
  const initial = createInitialState(now);
  if (!raw || typeof raw !== "object") return initial;

  const state = {
    ...initial,
    version: SAVE_VERSION,
    resources: {
      credits: clampFinite(raw.resources?.credits, 0, initial.resources.credits),
      scrap: clampFinite(raw.resources?.scrap),
      alloy: clampFinite(raw.resources?.alloy),
    },
    levels: {
      salvage: Math.max(1, Math.floor(clampFinite(raw.levels?.salvage, 1, 1))),
      refinery: Math.max(1, Math.floor(clampFinite(raw.levels?.refinery, 1, 1))),
      logistics: Math.max(1, Math.floor(clampFinite(raw.levels?.logistics, 1, 1))),
    },
    buyMode: raw.buyMode === "max" ? "max" : [1, 10].includes(Number(raw.buyMode)) ? Number(raw.buyMode) : 1,
    tutorial: {
      step: Math.min(5, Math.floor(clampFinite(raw.tutorial?.step))),
      taps: Math.min(3, Math.floor(clampFinite(raw.tutorial?.taps))),
      observationStartedAt: clampFinite(raw.tutorial?.observationStartedAt),
    },
    settings: {
      music: Boolean(raw.settings?.music),
      sfx: raw.settings?.sfx !== false,
    },
    refresh: {
      freeUsed: Boolean(raw.refresh?.freeUsed),
      readyAt: clampFinite(raw.refresh?.readyAt),
    },
    lastSavedAt: clampFinite(raw.lastSavedAt, 0, now),
  };

  state.orders = Array.isArray(raw.orders)
    ? raw.orders.slice(0, 3).map((order, index) => ({
        id: String(order?.id || `${now}-${index}`),
        name: String(order?.name || ORDER_TEMPLATES[index].name).slice(0, 32),
        icon: String(order?.icon || ORDER_TEMPLATES[index].icon).slice(0, 4),
        requirement: Math.max(1, Math.floor(clampFinite(order?.requirement, 1, ORDER_TEMPLATES[index].requirement))),
        reward: Math.max(1, Math.floor(clampFinite(order?.reward, 1, ORDER_TEMPLATES[index].requirement * 3))),
        gold: Boolean(order?.gold),
      }))
    : initial.orders;

  while (state.orders.length < 3) {
    state.orders.push(makeOrder(state.orders.length, state.levels.logistics, now));
  }

  const delivery = raw.activeDelivery;
  state.activeDelivery =
    delivery && typeof delivery === "object"
      ? {
          orderId: String(delivery.orderId || ""),
          reward: clampFinite(delivery.reward),
          startedAt: clampFinite(delivery.startedAt),
          endsAt: clampFinite(delivery.endsAt),
        }
      : null;

  return state;
}

export function calculateOfflineReward(state, now = Date.now()) {
  const lastSavedAt = clampFinite(state?.lastSavedAt, 0, now);
  const elapsedSeconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (now - lastSavedAt) / 1000));
  const rates = calculateRates(state);
  const alloyPerSecond = Math.min(rates.salvagePerSecond, rates.refineryPerSecond);
  const credits = Math.floor(
    elapsedSeconds * alloyPerSecond * 3 * rates.logisticsMultiplier * OFFLINE_EFFICIENCY,
  );

  return {
    seconds: elapsedSeconds,
    credits: clampFinite(credits),
  };
}

export function advanceProduction(state, seconds) {
  const elapsed = Math.min(60, clampFinite(seconds));
  if (!elapsed) return state;

  const rates = calculateRates(state);
  const generatedScrap = rates.salvagePerSecond * elapsed;
  state.resources.scrap = clampFinite(state.resources.scrap) + generatedScrap;

  const refined = Math.min(state.resources.scrap, rates.refineryPerSecond * elapsed);
  state.resources.scrap = Math.max(0, state.resources.scrap - refined);
  state.resources.alloy = clampFinite(state.resources.alloy) + refined;
  return state;
}

const dom = {};
let state;
let pendingOfflineCredits = 0;
let lastFrame = 0;
let lastRender = 0;
let holdTimer = null;
let musicTimer = null;
let audioContext = null;

function queryDom() {
  [
    "credits-value",
    "alloy-value",
    "scrap-value",
    "scrap-rate",
    "alloy-rate",
    "credit-rate",
    "station-status",
    "wreck",
    "wreck-yield",
    "float-layer",
    "drone-lane",
    "conveyor",
    "furnace",
    "furnace-state",
    "freighter",
    "upgrade-list",
    "batch-selector",
    "orders-list",
    "refresh-orders",
    "refresh-label",
    "starport-view",
    "orders-view",
    "nav-starport",
    "nav-orders",
    "tutorial-tip",
    "tutorial-copy",
    "tutorial-skip",
    "offline-modal",
    "offline-time",
    "offline-credits",
    "offline-claim",
    "settings-modal",
    "settings-open",
    "settings-close",
    "music-toggle",
    "sfx-toggle",
    "reset-progress",
    "toast",
  ].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function loadState() {
  try {
    return sanitizeState(JSON.parse(localStorage.getItem(SAVE_KEY)), Date.now());
  } catch {
    return createInitialState(Date.now());
  }
}

function saveState() {
  state.lastSavedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    showToast("存档空间不足，本次进度未写入");
  }
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioContext = new AudioCtor();
  }
  audioContext?.resume?.();
}

function playTone(frequency = 220, duration = 0.06, type = "sine", gain = 0.035) {
  if (!state.settings.sfx) return;
  ensureAudio();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const amplifier = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  amplifier.gain.setValueAtTime(gain, audioContext.currentTime);
  amplifier.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(amplifier);
  amplifier.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function syncMusic() {
  window.clearInterval(musicTimer);
  musicTimer = null;
  if (!state.settings.music) return;

  ensureAudio();
  let beat = 0;
  musicTimer = window.setInterval(() => {
    const tones = [110, 165, 220, 165];
    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const amplifier = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = tones[beat % tones.length];
      amplifier.gain.setValueAtTime(0.012, audioContext.currentTime);
      amplifier.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);
      oscillator.connect(amplifier);
      amplifier.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.34);
      beat += 1;
    }
  }, 667);
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 1900);
}

function spawnFloat(amount) {
  const marker = document.createElement("span");
  marker.className = "float-number";
  marker.textContent = `+${formatNumber(amount)}`;
  marker.style.setProperty("--float-x", `${18 + Math.round(Math.random() * 18)}%`);
  marker.style.setProperty("--float-y", `${31 + Math.round(Math.random() * 16)}%`);
  dom["float-layer"].append(marker);
  marker.addEventListener("animationend", () => marker.remove(), { once: true });
}

function salvageOnce() {
  ensureAudio();
  const amount = calculateRates(state).clickYield;
  state.resources.scrap += amount;
  state.tutorial.taps = Math.min(3, state.tutorial.taps + 1);
  if (state.tutorial.step === 0 && state.tutorial.taps >= 3) state.tutorial.step = 1;
  dom.wreck.classList.remove("is-tapped");
  void dom.wreck.offsetWidth;
  dom.wreck.classList.add("is-tapped");
  spawnFloat(amount);
  playTone(135 + Math.random() * 35, 0.045, "square", 0.025);
  render();
}

function stopSalvageHold() {
  window.clearInterval(holdTimer);
  holdTimer = null;
}

function startSalvageHold(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  salvageOnce();
  stopSalvageHold();
  holdTimer = window.setInterval(salvageOnce, 150);
}

function selectedPurchaseCount(type) {
  if (state.buyMode === "max") {
    return affordableCount(type, state.levels[type], state.resources.credits);
  }
  return affordableCount(type, state.levels[type], state.resources.credits, state.buyMode);
}

function purchaseUpgrade(type) {
  const requested = state.buyMode === "max" ? Infinity : state.buyMode;
  const count = affordableCount(type, state.levels[type], state.resources.credits, requested);
  if (count < 1) {
    playTone(90, 0.12, "sawtooth", 0.025);
    showToast("信用点不足");
    return;
  }

  const cost = upgradeCost(type, state.levels[type], count);
  state.resources.credits = Math.max(0, state.resources.credits - cost);
  state.levels[type] += count;

  if (state.tutorial.step === 1 && type === "salvage") {
    state.tutorial.step = 2;
    state.tutorial.observationStartedAt = Date.now();
  } else if (state.tutorial.step === 3 && type === "refinery") {
    state.tutorial.step = 4;
    switchView("orders");
  }

  playTone(440, 0.12, "triangle", 0.04);
  window.setTimeout(() => playTone(660, 0.12, "triangle", 0.03), 80);
  saveState();
  render(true);
}

function replaceOrder(orderId) {
  const index = state.orders.findIndex((order) => order.id === orderId);
  if (index < 0) return;
  state.orders[index] = makeOrder(index, state.levels.logistics, Date.now() + index * 7_711);
}

function deliverOrder(orderId) {
  if (state.activeDelivery) {
    showToast("货运艇正在执行上一份订单");
    return;
  }

  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  if (state.resources.alloy < order.requirement) {
    playTone(90, 0.12, "sawtooth", 0.025);
    showToast(`还需要 ${formatNumber(order.requirement - state.resources.alloy)} 合金`);
    return;
  }

  const now = Date.now();
  state.resources.alloy -= order.requirement;
  state.activeDelivery = {
    orderId,
    reward: order.reward,
    startedAt: now,
    endsAt: now + calculateRates(state).deliverySeconds * 1_000,
  };
  dom.freighter.classList.add("is-delivering");
  playTone(180, 0.22, "sawtooth", 0.035);
  saveState();
  render(true);
}

function finishDeliveryIfReady(now = Date.now()) {
  if (!state.activeDelivery || now < state.activeDelivery.endsAt) return;
  const { orderId, reward } = state.activeDelivery;
  state.resources.credits += reward;
  state.activeDelivery = null;
  replaceOrder(orderId);
  dom.freighter.classList.remove("is-delivering");
  playTone(523, 0.14, "triangle", 0.04);
  window.setTimeout(() => playTone(784, 0.18, "triangle", 0.035), 90);
  showToast(`交付完成 · +${formatNumber(reward)} 信用点`);

  if (state.tutorial.step === 4) {
    state.tutorial.step = 5;
    window.setTimeout(render, 20);
    window.setTimeout(() => {
      dom["tutorial-tip"].classList.add("is-complete");
    }, 2_800);
  }
  saveState();
}

function refreshOrders() {
  const now = Date.now();
  if (state.refresh.freeUsed && now < state.refresh.readyAt) {
    showToast("订单频道仍在刷新冷却");
    return;
  }
  if (state.activeDelivery) {
    showToast("完成当前交付后再刷新");
    return;
  }

  state.orders = createOrders(state.levels.logistics, now);
  if (!state.refresh.freeUsed) state.refresh.freeUsed = true;
  state.refresh.readyAt = now + 5 * 60 * 1_000;
  playTone(330, 0.1, "triangle", 0.025);
  saveState();
  render(true);
}

function switchView(view) {
  const isOrders = view === "orders";
  dom["starport-view"].hidden = isOrders;
  dom["orders-view"].hidden = !isOrders;
  dom["starport-view"].classList.toggle("is-active", !isOrders);
  dom["orders-view"].classList.toggle("is-active", isOrders);
  dom["nav-starport"].classList.toggle("is-active", !isOrders);
  dom["nav-orders"].classList.toggle("is-active", isOrders);
  dom["nav-starport"].setAttribute("aria-selected", String(!isOrders));
  dom["nav-orders"].setAttribute("aria-selected", String(isOrders));
  dom["nav-starport"].setAttribute("aria-pressed", String(!isOrders));
  dom["nav-orders"].setAttribute("aria-pressed", String(isOrders));
}

function renderDrones() {
  const count = Math.min(8, 1 + Math.floor((state.levels.salvage - 1) / 10));
  if (dom["drone-lane"].childElementCount === count) return;
  dom["drone-lane"].replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const drone = document.createElement("span");
    drone.className = "drone";
    drone.style.setProperty("--drone-index", String(index));
    dom["drone-lane"].append(drone);
  }
}

function upgradeDescription(type, rates) {
  if (type === "salvage") return `${formatNumber(rates.salvagePerSecond)} 废金属/秒`;
  if (type === "refinery") return `${formatNumber(rates.refineryPerSecond)} 合金/秒`;
  return `订单收益 ×${rates.logisticsMultiplier.toFixed(2)}`;
}

function renderUpgrades() {
  const types = [
    { id: "salvage", icon: "⌁", name: "打捞阵列", accent: "cyan" },
    { id: "refinery", icon: "⬡", name: "精炼炉", accent: "orange" },
    { id: "logistics", icon: "➤", name: "物流航道", accent: "gold" },
  ];
  const rates = calculateRates(state);

  dom["upgrade-list"].innerHTML = types
    .map((type) => {
      const count = selectedPurchaseCount(type.id);
      const displayCount = state.buyMode === "max" ? Math.max(1, count) : state.buyMode;
      const cost = upgradeCost(type.id, state.levels[type.id], displayCount);
      const disabled = count < 1;
      const tutorialTarget =
        (state.tutorial.step === 1 && type.id === "salvage") ||
        (state.tutorial.step === 3 && type.id === "refinery");
      return `
        <article class="upgrade-card upgrade-card--${type.id}${tutorialTarget ? " tutorial-target" : ""}">
          <span class="upgrade-card__icon" aria-hidden="true">${type.icon}</span>
          <div class="upgrade-card__copy">
            <span>${type.name} · LV.<b>${state.levels[type.id]}</b></span>
            <strong>${upgradeDescription(type.id, rates)}</strong>
            <small>下一等级继续提升生产效率</small>
          </div>
          <button type="button" data-upgrade="${type.id}" ${disabled ? "disabled" : ""}>
            <span>升级${displayCount > 1 ? ` ×${displayCount}` : ""}</span>
            <strong><i>✦</i> ${formatNumber(cost)}</strong>
          </button>
        </article>`;
    })
    .join("");
}

function renderOrders(now) {
  const delivery = state.activeDelivery;
  dom["orders-list"].innerHTML = state.orders
    .map((order) => {
      const isActive = delivery?.orderId === order.id;
      const canAfford = state.resources.alloy >= order.requirement;
      const remaining = isActive ? Math.max(0, Math.ceil((delivery.endsAt - now) / 1_000)) : 0;
      return `
        <article class="order-card${order.gold ? " is-gold" : ""}${isActive ? " is-active" : ""}${
          state.tutorial.step === 4 && canAfford ? " tutorial-target" : ""
        }">
          <span class="order-card__icon" aria-hidden="true">${order.icon}</span>
          <div class="order-card__copy">
            <span>${order.gold ? "稀有航线" : "常规航线"}</span>
            <strong>${order.name}</strong>
            <small>需要 <b>${formatNumber(order.requirement)}</b> 合金</small>
          </div>
          <button class="order-button" type="button" data-order="${order.id}" ${
            delivery && !isActive ? "disabled" : ""
          }>
            <span>${isActive ? `运输中 ${remaining}s` : "交付"}</span>
            <small>+${formatNumber(order.reward)} ✦</small>
          </button>
        </article>`;
    })
    .join("");

  const ready = now >= state.refresh.readyAt;
  dom["refresh-orders"].disabled = Boolean(state.activeDelivery) || (state.refresh.freeUsed && !ready);
  dom["refresh-label"].textContent = !state.refresh.freeUsed
    ? "免费刷新"
    : ready
      ? "频道就绪"
      : `${Math.floor((state.refresh.readyAt - now) / 60_000)
          .toString()
          .padStart(2, "0")}:${Math.ceil(((state.refresh.readyAt - now) % 60_000) / 1_000)
          .toString()
          .padStart(2, "0")}`;
}

function renderTutorial(now) {
  const tutorials = [
    `按住残骸打捞废金属 <b>${state.tutorial.taps}/3</b>`,
    "升级一次打捞阵列，让无人机工作更快",
    "看，无人机正在自动回收残骸……",
    "升级一次精炼炉，把废金属转为合金",
    "前往订单频道，完成第一份合金交付",
    "星港已交给你。继续扩建，离线也会生产。",
  ];
  dom["tutorial-copy"].innerHTML = tutorials[state.tutorial.step];
  dom["tutorial-tip"].hidden = false;
  dom.wreck.classList.toggle("tutorial-target", state.tutorial.step === 0);
  dom["nav-orders"].classList.toggle("tutorial-target", state.tutorial.step === 4);

  if (
    state.tutorial.step === 2 &&
    state.tutorial.observationStartedAt &&
    now - state.tutorial.observationStartedAt > 2_000
  ) {
    state.tutorial.step = 3;
    saveState();
    render(true);
  }
}

function render(force = false) {
  const now = Date.now();
  if (!force && now - lastRender < 90) return;
  lastRender = now;
  const rates = calculateRates(state);

  dom["credits-value"].textContent = formatNumber(state.resources.credits);
  dom["alloy-value"].textContent = formatNumber(state.resources.alloy);
  dom["scrap-value"].textContent = formatNumber(state.resources.scrap);
  dom["scrap-rate"].textContent = `+${formatNumber(rates.salvagePerSecond)}/s`;
  dom["alloy-rate"].textContent = `+${formatNumber(rates.refineryPerSecond)}/s`;
  dom["credit-rate"].textContent = `产值 +${formatNumber(
    Math.min(rates.salvagePerSecond, rates.refineryPerSecond) * 3 * rates.logisticsMultiplier,
  )}/s`;
  dom["wreck-yield"].textContent = `+${formatNumber(rates.clickYield)}`;
  const refineryActive = state.resources.scrap > 0.05;
  dom.conveyor.classList.toggle("is-idle", !refineryActive);
  dom.furnace.classList.toggle("is-idle", !refineryActive);
  dom["furnace-state"].textContent = refineryActive ? "精炼中" : "待原料";
  dom["station-status"].textContent = refineryActive ? "生产线在线" : "等待打捞";
  dom.freighter.style.setProperty("--freighter-scale", String(Math.min(1.3, 1 + (state.levels.logistics - 1) * 0.01)));

  [...dom["batch-selector"].querySelectorAll("button")].forEach((button) => {
    const mode = button.dataset.batch === "max" ? "max" : Number(button.dataset.batch);
    button.classList.toggle("is-active", state.buyMode === mode);
    button.setAttribute("aria-pressed", String(state.buyMode === mode));
  });

  renderDrones();
  renderUpgrades();
  renderOrders(now);
  renderTutorial(now);
  dom["music-toggle"].checked = state.settings.music;
  dom["sfx-toggle"].checked = state.settings.sfx;
}

function gameLoop(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const seconds = Math.min(0.25, Math.max(0, (timestamp - lastFrame) / 1_000));
  lastFrame = timestamp;
  advanceProduction(state, seconds);
  finishDeliveryIfReady();
  render();
  window.requestAnimationFrame(gameLoop);
}

function setModal(modal, open) {
  modal.hidden = !open;
  document.body.classList.toggle("has-modal", open);
  if (open) {
    window.setTimeout(() => modal.querySelector("button, input")?.focus(), 0);
  }
}

function bindEvents() {
  dom.wreck.addEventListener("pointerdown", startSalvageHold);
  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    dom.wreck.addEventListener(eventName, stopSalvageHold);
  });

  dom["batch-selector"].addEventListener("click", (event) => {
    const button = event.target.closest("[data-batch]");
    if (!button) return;
    state.buyMode = button.dataset.batch === "max" ? "max" : Number(button.dataset.batch);
    playTone(270, 0.04, "square", 0.018);
    render(true);
  });

  dom["upgrade-list"].addEventListener("click", (event) => {
    const button = event.target.closest("[data-upgrade]");
    if (button) purchaseUpgrade(button.dataset.upgrade);
  });

  dom["orders-list"].addEventListener("click", (event) => {
    const button = event.target.closest("[data-order]");
    if (button) deliverOrder(button.dataset.order);
  });

  dom["refresh-orders"].addEventListener("click", refreshOrders);
  dom["nav-starport"].addEventListener("click", () => switchView("starport"));
  dom["nav-orders"].addEventListener("click", () => switchView("orders"));
  dom["tutorial-skip"].addEventListener("click", () => {
    state.tutorial.step = 5;
    dom["tutorial-tip"].classList.add("is-complete");
    saveState();
  });

  dom["settings-open"].addEventListener("click", () => setModal(dom["settings-modal"], true));
  dom["settings-close"].addEventListener("click", () => setModal(dom["settings-modal"], false));
  dom["music-toggle"].addEventListener("change", (event) => {
    state.settings.music = event.target.checked;
    syncMusic();
    saveState();
  });
  dom["sfx-toggle"].addEventListener("change", (event) => {
    state.settings.sfx = event.target.checked;
    if (state.settings.sfx) playTone(440, 0.08, "triangle", 0.035);
    saveState();
  });
  dom["reset-progress"].addEventListener("click", () => {
    if (!window.confirm("确定清空星港进度并重新开始吗？")) return;
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  });

  dom["offline-claim"].addEventListener("click", () => {
    state.resources.credits += pendingOfflineCredits;
    pendingOfflineCredits = 0;
    setModal(dom["offline-modal"], false);
    playTone(523, 0.16, "triangle", 0.04);
    showToast("离线收益已入账");
    saveState();
    render(true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!dom["settings-modal"].hidden) setModal(dom["settings-modal"], false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });
  window.addEventListener("pagehide", saveState);
}

function presentOfflineReward(offline) {
  if (offline.seconds < 30 || offline.credits < 1) return;
  pendingOfflineCredits = offline.credits;
  const hours = Math.floor(offline.seconds / 3_600);
  const minutes = Math.floor((offline.seconds % 3_600) / 60);
  dom["offline-time"].textContent = `${hours ? `${hours} 小时 ` : ""}${minutes} 分钟`;
  dom["offline-credits"].textContent = formatNumber(offline.credits);
  setModal(dom["offline-modal"], true);
}

function boot() {
  queryDom();
  state = loadState();
  const offline = calculateOfflineReward(state, Date.now());
  state.lastSavedAt = Date.now();
  bindEvents();
  switchView("starport");
  render(true);
  presentOfflineReward(offline);
  window.setInterval(saveState, 10_000);
  window.requestAnimationFrame(gameLoop);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
