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


class Entity {
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




const EPSILON = 0.001;
const BLOCK_WIDTH = 50;

let galleryShapes = [];

function gridPosToPixelPos(gridPos) {
  return multiply(gridPos, BLOCK_WIDTH);
}

function pixelPosToGridPos(pixelPos) {
  return round(divide(pixelPos, BLOCK_WIDTH));
}  

function makeBlockShape(gridPos) {
  let rect = new PIXI.Graphics();
  rect.beginFill(0x00FF00);
  rect.lineStyle(4, 0x000000, 1);
  rect.drawRect(-BLOCK_WIDTH/2, -BLOCK_WIDTH/2, BLOCK_WIDTH, BLOCK_WIDTH);
  rect.endFill();

  rect.position = gridPosToPixelPos(gridPos);
  return rect;
}



class BlockScene extends Entity {
  constructor() {
    super();
  }

  setup() {
    this.done = false;
    this.draggingBlock = null;

    this.container = new PIXI.Container();
    sceneLayer.addChild(this.container);

    this.blocksContainer = new PIXI.Container();
    this.container.addChild(this.blocksContainer);

    // Make blocks
    this.blockGrid = [];
    for(let i = 0; i < 10; i++) {
      const gridPos = new PIXI.Point(i, 0);
      this.blockGrid.push(gridPos);

      let rect = makeBlockShape(gridPos);

      rect.buttonMode = true;
      rect.on("pointerdown", this.onPointerDown.bind(this))
      rect.on("pointerup", this.onPointerUp.bind(this))
      rect.on("pointermove", this.onPointerMove.bind(this))

      this.blocksContainer.addChild(rect);
    }

    this.updateBlocks();


    const galleryBg = new PIXI.Graphics();
    galleryBg.beginFill(0x808080);
    galleryBg.lineColor = "0xffffff";
    galleryBg.lineWidth = 1;
    galleryBg.drawRect(0, 0, 150, 150);
    galleryBg.endFill();
    galleryBg.position.set(800, 10);
    this.container.addChild(galleryBg);

    const galleryParent = new PIXI.Container();;
    galleryParent.position.set(875, 85);
    galleryParent.scale.set(0.3);
    this.container.addChild(galleryParent);

    this.galleryLayer = new PIXI.Container();
    galleryParent.addChild(this.galleryLayer);

    // HTML
    document.getElementById("blocks-gui").style.display = "block";
    document.getElementById("add-shape").addEventListener("click", this.onAddShape.bind(this));
    document.getElementById("done-adding").addEventListener("click", this.onDoneAdding.bind(this));
  }

  teardown() {
    sceneLayer.removeChild(this.container);
    document.getElementById("blocks-gui").style.display = "none";
  }

  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }

  onPointerDown(e) {
    this.draggingBlock = e.currentTarget;

    // Reorder so this block is on top
    this.blocksContainer.setChildIndex(this.draggingBlock, this.blocksContainer.children.length - 1);

    const gridPos = pixelPosToGridPos(this.draggingBlock.position);
    this.blockGrid = removeFromArray(this.blockGrid, gridPos);
  }

  onPointerUp(e) {
    if(!this.draggingBlock) return;


    this.dropBlock(this.draggingBlock, this.draggingBlock.position);
    this.draggingBlock = null;
    this.updateBlocks();
  }

  onPointerMove(e) {
    if(!this.draggingBlock) return;

    this.draggingBlock.position = subtract(e.data.getLocalPosition(app.stage), this.blocksContainer.position);
  }

  updateBlocks() {
    this.repositionBlocks();
    this.updateBlockInteractivity();
  }

  repositionBlocks() {
    centerContainer(this.blocksContainer, new PIXI.Point(app.view.width / 2, app.view.height / 2));
  }

  updateBlockInteractivity() {
    for(const blockGraphic of this.blocksContainer.children) {
      if(this.canMoveBlock(pixelPosToGridPos(blockGraphic.position))) {
        blockGraphic.interactive = true;
      } else {
        blockGraphic.interactive = false;
      }
    }
  }

  dropBlock(block, droppedPos) {
    // Find closest grid position
    const gridPos = pixelPosToGridPos(droppedPos);

    const freeGridPositions = this.findFreeGridPositions();
    const closestGridPos = _.min(freeGridPositions, freePos => distance(gridPos, freePos));
    
    block.position = gridPosToPixelPos(closestGridPos);
    this.blockGrid.push(closestGridPos);
  }

  findFreeGridPositions() {
    var ret = [];
    for(let b of this.blockGrid) {
      ret.push(new PIXI.Point(b.x - 1, b.y));
      ret.push(new PIXI.Point(b.x + 1, b.y));
      ret.push(new PIXI.Point(b.x, b.y - 1));
      ret.push(new PIXI.Point(b.x, b.y + 1));
    }
    ret = uniq(ret);
    return difference(ret, this.blockGrid);
  }

  blocksAreNeighbors(a, b) {
    const x = Math.abs(a.x - b.x); 
    const y = Math.abs(a.y - b.y); 
    return x == 1 && y == 0 || x == 0 && y == 1; 
  }

  makeAdjacencyList(blocks) {
    let adjList = _.map(blocks, function () {
      return [];
    });
    for (let i = 0; i < blocks.length - 1; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (this.blocksAreNeighbors(blocks[i], blocks[j])) {
            adjList[i].push(j);
            adjList[j].push(i);
        }
      }
    }
    return adjList;
  }

  visitBlocks(adjList, startingIndices) {
    let visited = [startingIndices];
    while (true) {
      let toVisit = _.reduce(visited[visited.length - 1], function (memo, visitingIndex) {
        return memo.concat(adjList[visitingIndex]);
      }, []);
      toVisit = _.uniq(toVisit);
      toVisit = _.difference.apply(_, [toVisit].concat(visited));
      if (toVisit.length > 0) {
        visited.push(toVisit);
      } else {
        return visited;
      }
    }
  }

  canMoveBlock(gridPos) {
    let blocksWithout = removeFromArray(this.blockGrid, gridPos);
    let adjList = this.makeAdjacencyList(blocksWithout);
    let visited = this.visitBlocks(adjList, [0]);
    return _.flatten(visited).length == blocksWithout.length;
  }

  onAddShape() {
    const galleryShape = cloneData(this.blockGrid)
    galleryShapes.push(galleryShape);
    this.updateGalleryShape(galleryShape);
  }

  onDoneAdding() {
    this.done = true;
  }

  updateGalleryShape(galleryShape) {
    this.galleryLayer.removeChildren();
    for(let block of galleryShape)
      this.galleryLayer.addChild(makeBlockShape(block));
    centerContainer(this.galleryLayer, new PIXI.Point());
  }
}

class GalleryScene extends Entity {
  setup() {
    this.done = false;
    this.selectedIndexes = [];

    this.container = new PIXI.Container();
    sceneLayer.addChild(this.container);

    for(let i = 0; i < galleryShapes.length; i++) {
      const row = Math.floor(i / 9); 
      const col = Math.floor(i % 9);
      const galleryShapeCenter = new PIXI.Point(60 + col * 100, 80 + row * 100);

      const galleryBg = new PIXI.Graphics();
      galleryBg.beginFill(0x333333);
      galleryBg.drawRect(-40, -40, 80, 80);
      galleryBg.endFill();
      galleryBg.position = galleryShapeCenter;
      this.container.addChild(galleryBg);

      galleryBg.on("pointerdown", e => this.onToggleShape(galleryBg, i));
      galleryBg.buttonMode = true;
      galleryBg.interactive = true;

      const galleryParent = new PIXI.Container();
      galleryParent.position = galleryShapeCenter;
      galleryParent.scale.set(0.1);
      this.container.addChild(galleryParent);

      const galleryLayer = new PIXI.Container();
      for(let block of galleryShapes[i])
        galleryLayer.addChild(makeBlockShape(block));
      centerContainer(galleryLayer, new PIXI.Point());
      galleryParent.addChild(galleryLayer);

      // HTML
      document.getElementById("selection-gui").style.display = "block";
      document.getElementById("done-selection").addEventListener("click", e => this.done = true);
    }
  }

  teardown() {
    sceneLayer.removeChild(this.container);
    document.getElementById("selection-gui").style.display = "none";
  }
  
  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }

  onToggleShape(shape, shapeIndex) {
    const isSelected = !_.contains(this.selectedIndexes, shapeIndex);

    if(isSelected) this.selectedIndexes.push(shapeIndex);
    else this.selectedIndexes = removeFromArray(this.selectedIndexes, shapeIndex); 
    
    shape.beginFill(isSelected ? 0xFF0000 : 0x333333);
    shape.drawRect(-40, -40, 80, 80);
    shape.endFill();
  }
}

class DoneScene extends Entity {
  setup() {
    document.getElementById("done-gui").style.display = "block";
  }

  teardown() {
    document.getElementById("done-gui").style.display = "none";
  }  
}


function provideNextScene(currentScene, requestedTransition) {
  switch(currentScene.constructor.name) {
    case "BlockScene":
      return new GalleryScene();
      break;

    case "GalleryScene":
      return new DoneScene();
      break;

    default:
      console.error("No transition from", currentScene, "with transition", requestedTransition);
      return null;
  }
}


const app = new PIXI.Application({
  width: 960,
  height: 540,
  view: document.getElementById("pixi-canvas")
});


/*
app.loader
  .add(["images/apple.png",
    "images/orange.png",
    "images/banana.png",
    "images/logo.png",
    "images/tree scene.png",
    "images/seed.png",
    "images/seedling.png",
    "images/animal.png",
    "images/small fruit.png",
    "images/poop.png"
  ]).on("progress", loadProgressHandler)
  .load(setup);
*/


// // Scale canvas on 
// scaleToWindow(app.view);

// window.addEventListener("resize", function(event){ 
//   scaleToWindow(app.view);
// });

// Doesn't work on fullscreen

//document.addEventListener("fullscreenchange", function( event ) { scaleToWindow(app.view); });

// var requestFullScreen = document.documentElement.requestFullscreen || 
//   document.documentElement.mozRequestFullScreen || 
//   document.documentElement.webkitRequestFullscreen ||
//   document.documentElement.msRequestFullscreen;

function requestFullScreen(element) {
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

function loadProgressHandler(loader, resource) {
  //Display the file `url` currently being loaded
  console.log("loading: " + resource.url); 

  //Display the precentage of files currently loaded
  console.log("progress: " + loader.progress + "%"); 

  //If you gave your files names as the first argument 
  //of the `add` method, you can access them like this
  //console.log("loading: " + resource.name);
}

let sceneLayer;

const defaultStartingScene = "block";

function getStartingScene() {
  const sceneName = new URL(document.location).searchParams.get("scene") || defaultStartingScene;
  switch(sceneName) {
    case "block": return new BlockScene();
  } 
}

function setup() {
  sceneLayer = new PIXI.Container();
  app.stage.addChild(sceneLayer);

  app.ticker.add(update);

  // Start scene
  changeScene(getStartingScene());
}

let currentScene;
let sceneStartedAt = 0;

function changeScene(newScene) {
  if(currentScene) currentScene.teardown();

  newScene.setup();
  currentScene = newScene;
  sceneStartedAt = Date.now();
  newScene.update(0);
}

function update(timeScale)
{
  const timeSinceStart = Date.now() - sceneStartedAt;
  currentScene.update(timeSinceStart, timeScale);

  const requestedTransition = currentScene.requestedTransition(timeSinceStart);
  if(requestedTransition != null) {
      const nextScene = provideNextScene(currentScene, requestedTransition);
      if(nextScene != null) changeScene(nextScene);
  }
  app.renderer.render(app.stage);
}


// Now start
setup();

