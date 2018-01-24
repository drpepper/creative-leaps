import "../node_modules/url-search-params-polyfill/index.js";


export function makeSprite(name) { 
  return new PIXI.Sprite(app.loader.resources[name].texture);
}

export function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

export function distanceBetween(a, b) {
  let x = a.x - b.x;
  let y = a.y - b.y;
  return Math.sqrt(x*x + y*y);
}

export function lerp(a, b, p) {
  const x = b.x - a.x;
  const y = b.y - a.y;
  return new PIXI.Point(a.x + p * x, a.y + p * y);
}

export function add(...points) {
  const r = new PIXI.Point();
  for(let p of points) {
    r.x += p.x;
    r.y += p.y;
  } 
  return r;
}

export function subtract(...points) {
  const r = new PIXI.Point(points[0].x, points[0].y);
  for(let i = 1; i < points.length; i++) {
    r.x -= points[i].x;
    r.y -= points[i].y;
  } 
  return r;
}

export function multiply(a, p) {
  return new PIXI.Point(a.x * p, a.y * p);
}

export function divide(a, p) {
  return new PIXI.Point(a.x / p, a.y / p);
}

export function floor(p) {
  return new PIXI.Point(Math.floor(p.x), Math.floor(p.y));
}

export function round(p) {
  return new PIXI.Point(Math.round(p.x), Math.round(p.y));
}

export function min(...points) {
  const r = new PIXI.Point(Infinity, Infinity);
  for(let p of points) {
    r.x = Math.min(p.x, r.x);
    r.y = Math.min(p.y, r.y);
  } 
  return r;
}

export function max(...points) {
  const r = new PIXI.Point(-Infinity, -Infinity);
  for(let p of points) {
    r.x = Math.max(p.x, r.x);
    r.y = Math.max(p.y, r.y);
  } 
  return r;
}

export function average(...points) {
  var sum = new PIXI.Point();
  for(let point of points) sum = add(sum, point);
  return divide(sum, points.length);
}

export function moveTowards(a, b, speed) {
  const d = distanceBetween(a, b);
  return lerp(a, b, clamp(speed / d, 0, 1));
}

// Test containment using isEqual
export function contains(list, p) {
  for(let x of list) {
    if(_.isEqual(x, p)) return true;
  }
  return false;
} 

// Test containment using isEqual
export function indexOf(list, p) {
  for(let i = 0; i < list.length; i++) {
    if(_.isEqual(list[i], p)) return i;
  }
  return -1;
} 

// Find unique elements using isEqual
export function uniq(array) {
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
export function difference(array) {
  const rest = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  return _.filter(array, (value) => !contains(rest, value));
}

// Uses contains()
export function removeFromArray(array, value) {
  let ret = [];
  for(let element of array) if(!_.isEqual(element, value)) ret.push(element);
  return ret;
}

export function distance(a, b) {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return Math.sqrt(x*x + y*y);
}

export function cloneData(o) {
  return JSON.parse(JSON.stringify(o));
} 

export function lerpColor(start, end, fraction) {
  const r = ((end & 0xff0000) >> 16) - ((start & 0xff0000) >> 16);
  const g = ((end & 0x00ff00) >> 8) - ((start & 0x00ff00) >> 8);
  const b = (end & 0x0000ff) - (start & 0x0000ff);
  return start + ((r * fraction) << 16) + ((g * fraction) << 8) + b;
}

export function cyclicLerpColor(start, end, fraction) {
  return fraction < 0.5 ? lerpColor(start, end, fraction / 0.5) : lerpColor(end, start, (fraction - 0.5) / 0.5);
}

export function toFixedFloor(x, decimalPlaces) {
  const divider = Math.pow(10, decimalPlaces);
  return (Math.floor(x * divider) / divider).toFixed(decimalPlaces);
}

export function resizeGame(app) {
  const parentSize = new PIXI.Point(window.innerWidth, window.innerHeight);
  const scale = toFixedFloor(Math.min(parentSize.x / app.renderer.width, parentSize.y / app.renderer.height), 2);

  const newSize = new PIXI.Point(scale * app.renderer.width, scale * app.renderer.height);
  const remainingSpace = new PIXI.Point(parentSize.x - newSize.x, parentSize.y - newSize.y);

  console.log("setting scale to", scale);

  const css = `scale(${scale}) translate(${(remainingSpace.x / 2).toFixed(2)}px, ${(remainingSpace.y / 2).toFixed(2)}px)`;
  const element = document.getElementById("game-container");
  for(const prop of ["transform", "webkitTransform", "msTransform"]) {
    document.getElementById("game-container").style[prop] = css;
  }
}

export function getStartingScene(defaultScene) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("scene") || defaultScene;
}

export function provideNextScene(sceneTransitions, currentScene, requestedTransition) {
  if(currentScene in sceneTransitions) return sceneTransitions[currentScene];

  console.error("No transition from", currentScene, "with transition", requestedTransition);
  return null;
}

export function centerContainer(container, centerPos) {
  const oldBlockPositions = container.children.map(c => c.position);
  const minBlockPos = min.apply(null, oldBlockPositions);
  const maxBlockPos = max.apply(null, oldBlockPositions);
  const blockCenterPos = average(minBlockPos, maxBlockPos);
  const offset = subtract(centerPos, blockCenterPos);

  container.position = offset;
}

export function supportsFullscreen(element) {
  return !!(element.requestFullscreen 
    || element.mozRequestFullScreen 
    || element.webkitRequestFullscreen 
    || element.msRequestFullscreen);
}

export function requestFullscreen(element) {
  if(element.requestFullscreen) {
    element.requestFullscreen();
  } else if(element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if(element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if(element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

export function exitFullscreen() {
  if(document.exitFullscreen) document.exitFullscreen();
  else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
  else if(document.msExitFullscreen) document.msExitFullscreen();
} 

export function inFullscreen() {
  return document.fullscreenElement 
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullScreenElement;
}



export class Entity extends PIXI.utils.EventEmitter {
  setup() {}
  update(timeSinceStart, timeScale) {}
  teardown() {}
  requestedTransition(timeSinceStart) { return null; } // Provide string transition name, such as "next"
}

export class StateMachine extends Entity {
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

export class ParallelEntities extends Entity {
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

