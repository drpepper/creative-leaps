// UTILITY FUNCTIONS

function makeSprite(name) { 
  return new PIXI.Sprite(app.loader.resources[name].texture);
}

function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

function distanceBetween(a, b) {
  let x = a.x - b.x;
  let y = a.y - b.y;
  return Math.sqrt(x*x + y*y);
}

function lerp(a, b, p) {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return new PIXI.Point(a.x + p * x, a.y + p * y);
}

function add(...points) {
  const r = new PIXI.Point();
  for(p of points) {
    r.x += p.x;
    r.y += p.y;
  } 
  return r;
}

function subtract(...points) {
  const r = new PIXI.Point(points[0].x, points[0].y);
  for(let i = 1; i < points.length; i++) {
    r.x -= points[i].x;
    r.y -= points[i].y;
  } 
  return r;
}

function multiply(a, p) {
  return new PIXI.Point(a.x * p, a.y * p);
}

function divide(a, p) {
  return new PIXI.Point(a.x / p, a.y / p);
}

function floor(p) {
  return new PIXI.Point(Math.floor(p.x), Math.floor(p.y));
}

function round(p) {
  return new PIXI.Point(Math.round(p.x), Math.round(p.y));
}

function min(...points) {
  const r = new PIXI.Point(Infinity, Infinity);
  for(p of points) {
    r.x = Math.min(p.x, r.x);
    r.y = Math.min(p.y, r.y);
  } 
  return r;
}

function max(...points) {
  const r = new PIXI.Point(-Infinity, -Infinity);
  for(p of points) {
    r.x = Math.max(p.x, r.x);
    r.y = Math.max(p.y, r.y);
  } 
  return r;
}

function average(...points) {
  var sum = new PIXI.Point();
  for(let point of points) sum = add(sum, point);
  return divide(sum, points.length);
}

function moveTowards(a, b, speed) {
  const d = distanceBetween(a, b);
  return lerp(a, b, clamp(speed / d, 0, 1));
}

// Test containment using isEqual
function contains(list, p) {
  for(let x of list) {
    if(_.isEqual(x, p)) return true;
  }
  return false;
} 

// Test containment using isEqual
function indexOf(list, p) {
  for(let i = 0; i < list.length; i++) {
    if(_.isEqual(list[i], p)) return i;
  }
  return -1;
} 

// Find unique elements using isEqual
function uniq(array) {
  let results = [];
  let seen = [];
  array.forEach((value, index) => {
    if(!contains(seen, value)) {
      seen.push(value)
      results.push(array[index])
    }
  });
  return results;
}

// Like Underscore's method, but uses contains()
function difference(array) {
  rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  return _.filter(array, (value) => !contains(rest, value));
}

// Uses contains()
function removeFromArray(array, value) {
  let ret = [];
  for(let element of array) if(!_.isEqual(element, value)) ret.push(element);
  return ret;
}

function distance(a, b) {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x*x + y*y);
}

function cloneData(o) {
  return JSON.parse(JSON.stringify(o));
} 

function centerContainer(container, centerPos) {
  const oldBlockPositions = container.children.map(c => c.position);
  const minBlockPos = min.apply(null, oldBlockPositions);
  const maxBlockPos = max.apply(null, oldBlockPositions);
  const blockCenterPos = average(minBlockPos, maxBlockPos);
  const offset = subtract(centerPos, blockCenterPos);

  container.position = offset;
}

function lerpColor(start, end, fraction) {
  const r = ((end & 0xff0000) >> 16) - ((start & 0xff0000) >> 16);
  const g = ((end & 0x00ff00) >> 8) - ((start & 0x00ff00) >> 8);
  const b = (end & 0x0000ff) - (start & 0x0000ff);
  return start + ((r * fraction) << 16) + ((g * fraction) << 8) + b;
}

function cyclicLerpColor(start, end, fraction) {
  return fraction < 0.5 ? lerpColor(start, end, fraction / 0.5) : lerpColor(end, start, (fraction - 0.5) / 0.5);
}

function resizeGame() {
  const parentSize = new PIXI.Point(window.innerWidth, window.innerHeight);
  const scale = Math.min(parentSize.x / app.renderer.width, parentSize.y / app.renderer.height).toFixed(2);

  const newSize = new PIXI.Point(scale * app.renderer.width, scale * app.renderer.height);
  const remainingSpace = new PIXI.Point(parentSize.x - newSize.x, parentSize.y - newSize.y);

  console.log("setting scale to", scale);

  document.getElementById("game-container").style.transform = 
    `scale(${scale}) translate(${(remainingSpace.x / 2).toFixed(2)}px, ${(remainingSpace.y / 2).toFixed(2)}px)`;
}


class Entity extends PIXI.utils.EventEmitter {
  setup() {}
  update(timeSinceStart, timeScale) {}
  teardown() {}
  requestedTransition(timeSinceStart) { return null; } // Provide string transition name, such as "next"
}

class StateMachine extends Entity {
  constructor(states, transitions, startingState = "start", endingState = "end") {
    super();

    this.states = states;
    this.transitions = transitions;
    this.startingState = startingState;
    this.endingState = endingState;
  }

  changeState(timeSinceStart, nextStateName) {
    if(this.state) this.state.teardown();

    this.stateName = nextStateName;

    if(nextStateName in this.states) {
      this.state = this.states[nextStateName];
      this.state.setup();      
    } else {
      console.warn("Cannot find state", nextStateName);
      this.state = null;
    }

    this.sceneStartedAt = timeSinceStart;
  }

  setup() {
    this.changeState(0, this.startingState)
  }

  update(timeSinceStart, timeScale) {
    if(!this.state) return;

    const timeSinceStateStart = timeSinceStart - this.sceneStartedAt;
    this.state.update(timeSinceStateStart, timeScale);

    const requestedTransition = this.state.requestedTransition(timeSinceStateStart);
    if(requestedTransition != null) {
      const nextStateName = this.transitions[this.stateName][requestedTransition];
      if(nextStateName != null) this.changeState(timeSinceStart, nextStateName)
    }
  }

  teardown() {
    if(this.state) this.state.teardown();
  }

  requestedTransition(timeSinceStart) { 
    return this.stateName == this.endingState ? "next" : null;
  }
}

class ParallelEntities extends Entity {
  constructor() {
    super();

    this.entities = arguments;
  }

  setup() {
    for(const entity of this.entities) {
      entity.setup();
    } 
  }

  update(timeSinceStart, timeScale) {
    for(const entity of this.entities) {
      entity.update(timeSinceStart, timeScale);
    }
  } 

  teardown() {
    for(const entity of this.entities) {
      entity.teardown();
    }     
  }

  requestedTransition(timeSinceStart) { 
    return this.entities[0].requestedTransition(timeSinceStart);
  }
}

function getStartingScene(defaultScene) {
  return new URL(document.location).searchParams.get("scene") || defaultScene;
}

function provideNextScene(sceneTransitions, currentScene, requestedTransition) {
  if(currentScene in sceneTransitions) return sceneTransitions[currentScene];

  console.error("No transition from", currentScene, "with transition", requestedTransition);
  return null;
}

