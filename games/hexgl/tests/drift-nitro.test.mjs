import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(vector) {
    return this.set(vector.x, vector.y, vector.z);
  }

  subSelf(vector) {
    this.x -= vector.x;
    this.y -= vector.y;
    this.z -= vector.z;
    return this;
  }

  addSelf(vector) {
    this.x += vector.x;
    this.y += vector.y;
    this.z += vector.z;
    return this;
  }

  lerpSelf(vector, amount) {
    this.x += (vector.x - this.x) * amount;
    this.y += (vector.y - this.y) * amount;
    this.z += (vector.z - this.z) * amount;
    return this;
  }

  isZero() {
    return this.x === 0 && this.y === 0 && this.z === 0;
  }
}

class Quaternion {
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  normalize() {
    return this;
  }

  multiplySelf() {
    return this;
  }

  copy(quaternion) {
    Object.assign(this, quaternion);
    return this;
  }
}

class Object3D {
  constructor() {
    this.position = new Vector3();
    this.quaternion = new Quaternion();
    this.matrix = {
      setPosition() {},
      setRotationFromQuaternion() {},
    };
  }

  translateX(amount) {
    this.position.x += amount;
  }

  translateY(amount) {
    this.position.y += amount;
  }

  translateZ(amount) {
    this.position.z += amount;
  }
}

function loadShipControls() {
  const listeners = {};
  const audioEvents = [];
  const document = {
    addEventListener(type, callback) {
      listeners[type] = callback;
    },
    getElementById() {
      return null;
    },
  };
  const context = vm.createContext({
    console,
    THREE: { Object3D, Quaternion, Vector3 },
    bkcore: {
      Audio: {
        play(name) {
          audioEvents.push(["play", name]);
        },
        stop(name) {
          audioEvents.push(["stop", name]);
        },
        setListenerPos() {},
        setListenerVelocity() {},
      },
      controllers: {
        GamepadController: { isCompatible: () => false },
        OrientationController: { isCompatible: () => false },
        TouchController: { isCompatible: () => false },
      },
      hexgl: {},
    },
  });

  const source = readFileSync(
    new URL("../public/bkcore/hexgl/ShipControls.js", import.meta.url),
    "utf8",
  );
  vm.runInContext(source, context);

  const controls = new context.bkcore.hexgl.ShipControls({
    controlType: 0,
    document,
  });

  return { audioEvents, controls, listeners };
}

test("WASD, Shift, and Space map to the expected racing actions", () => {
  const { controls, listeners } = loadShipControls();
  const event = (keyCode) => ({ keyCode, preventDefault() {} });

  listeners.keydown(event(87));
  listeners.keydown(event(83));
  listeners.keydown(event(65));
  listeners.keydown(event(68));
  listeners.keydown(event(16));
  listeners.keydown(event(32));
  assert.equal(controls.key.forward, true);
  assert.equal(controls.key.backward, true);
  assert.equal(controls.key.left, true);
  assert.equal(controls.key.right, true);
  assert.equal(controls.key.drift, true);
  assert.equal(controls.key.nitro, true);

  listeners.keyup(event(87));
  listeners.keyup(event(83));
  listeners.keyup(event(65));
  listeners.keyup(event(68));
  listeners.keyup(event(16));
  listeners.keyup(event(32));
  assert.equal(controls.key.forward, false);
  assert.equal(controls.key.backward, false);
  assert.equal(controls.key.left, false);
  assert.equal(controls.key.right, false);
  assert.equal(controls.key.drift, false);
  assert.equal(controls.key.nitro, false);
});

test("drifting changes the racing line and earns nitro", () => {
  const { controls } = loadShipControls();
  controls.active = true;
  controls.speed = 5;
  controls.speedRatio = controls.speed / controls.maxSpeed;
  controls.key.forward = true;
  controls.key.left = true;
  controls.key.drift = true;

  controls.update(1);

  assert.equal(controls.isDrifting, true);
  assert.ok(controls.nitro > 0);
  assert.ok(controls.movement.x > 0);
});

test("S braking reduces speed more quickly than coasting", () => {
  const { controls } = loadShipControls();
  controls.active = true;
  controls.speed = 5;
  controls.speedRatio = controls.speed / controls.maxSpeed;
  controls.key.backward = true;

  controls.update(1);

  assert.ok(controls.speed < 5 - controls.airResist);
});

test("nitro drains charge, adds forward thrust, and stops on release", () => {
  const { audioEvents, controls } = loadShipControls();
  controls.nitro = 0.5;
  controls.speedRatio = 0.8;
  controls.key.nitro = true;

  controls.updateNitro(1);
  assert.equal(controls.nitroActive, true);
  assert.ok(controls.nitro < 0.5);
  assert.equal(controls.movement.z, controls.nitroSpeed);
  assert.deepEqual(audioEvents.at(-1), ["play", "boost"]);

  controls.key.nitro = false;
  controls.updateNitro(1);
  assert.equal(controls.nitroActive, false);
  assert.deepEqual(audioEvents.at(-1), ["stop", "boost"]);
});
