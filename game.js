const EPSILON = 0.001;
const BLOCK_WIDTH = 50;
const MAX_SEARCH_TIME = 12 * 60 * 1000;
const BLOCK_COLOR = 0x81e700;
const HIGHLIGHTED_BLOCK_COLOR = 0x59853b;
const DRAG_HIGHLIGHT_PERIOD = 500;

let galleryShapes = [];
let searchScore = 0.33;
let redmetricsId = "12345";


function gridPosToPixelPos(gridPos) {
  return multiply(gridPos, BLOCK_WIDTH);
}

function pixelPosToGridPos(pixelPos) {
  return round(divide(pixelPos, BLOCK_WIDTH));
}  

function drawBlock(graphics, fillColor) {
  graphics.beginFill(fillColor);
  graphics.lineStyle(4, 0x000000, 1);
  graphics.drawRect(-BLOCK_WIDTH/2, -BLOCK_WIDTH/2, BLOCK_WIDTH, BLOCK_WIDTH);
  graphics.endFill();
}

function makeBlockShape(gridPos) {
  let rect = new PIXI.Graphics();
  drawBlock(rect, BLOCK_COLOR);

  rect.position = gridPosToPixelPos(gridPos);
  return rect;
}

function calculateSearchScore(shapeCount, timePlayed) {
  return Math.min(2 * ((1/88) * shapeCount * (720000 / timePlayed) - 0.5), 1);
}


class IntroScene extends Entity {
  setup() {
    document.getElementById("intro-gui").style.display = "block";

    this.done = false;
    document.getElementById("done-intro").addEventListener("click", e => this.done = true);
  }

  teardown() {
    document.getElementById("intro-gui").style.display = "none";
  }  

  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }
}


class TrainingScene extends Entity {
  setup() {
    this.done = false;
    this.didDropBlock = false;

    this.blockScene = new BlockScene(true);
    this.blockScene.setup();

    document.getElementById("add-shape").style.display = "none";
    document.getElementById("done-adding").style.display = "none";

    this.blockScene.on("droppedBlock", this.onDroppedBlock, this);
    this.blockScene.on("addedShape", this.onAddedShape, this);

    document.getElementById("training-gui").style.display = "block";
    document.getElementById("done-training-2").addEventListener("click", this.onDonePart2.bind(this));
    document.getElementById("done-training-4").addEventListener("click", e => this.done = true);
  }

  update(timeSinceStart) {
    this.blockScene.update(timeSinceStart);
  }

  teardown() {
    document.getElementById("done-adding").style.display = "block";
    this.blockScene.teardown();
    document.getElementById("training-gui").style.display = "none";
  }

  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }

  onDroppedBlock() {
    if(this.didDropBlock) return;

    this.didDropBlock = true;
    document.getElementById("training-1").style.display = "none";
    document.getElementById("training-2").style.display = "block";

    this.blockScene.highlightMovableBlocks();
  }

  onDonePart2() {
    this.blockScene.unhighlightMovableBlocks();

    document.getElementById("training-2").style.display = "none";
    document.getElementById("training-3").style.display = "block";

    document.getElementById("add-shape").style.display = "block";
  }

  onAddedShape() {
    document.getElementById("training-3").style.display = "none";
    document.getElementById("training-4").style.display = "block";
  }
}


class BlockScene extends Entity {
  setup() {
    this.done = false;
    this.draggingBlock = null;
    this.highlightedBlocks = new Set();
    this.targetBlockContainerPosition = new PIXI.Point();

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
    galleryBg.lineColor = 0xffffff;
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
    document.getElementById("done-adding").addEventListener("click", this.onAttemptDone.bind(this));
    document.getElementById("modal-confirm-cancel-button").addEventListener("click", this.cancelModal.bind(this));
    document.getElementById("modal-confirm-done-button").addEventListener("click", this.confirmDone.bind(this));
  }

  update(timeSinceStart) {
    if(timeSinceStart > MAX_SEARCH_TIME) {
      this.confirmDone();
      return;
    }

    // Animate highlighted blocks
    for(const block of this.highlightedBlocks) {
      const color = cyclicLerpColor(BLOCK_COLOR, HIGHLIGHTED_BLOCK_COLOR, 
        (timeSinceStart % DRAG_HIGHLIGHT_PERIOD) / DRAG_HIGHLIGHT_PERIOD);
      drawBlock(block, color);
    }

    if(distanceBetween(this.targetBlockContainerPosition, this.blocksContainer.position) > 1)
    {
      this.blocksContainer.position = lerp(this.blocksContainer.position, this.targetBlockContainerPosition, 0.5);
    }
  }

  teardown() {
    sceneLayer.removeChild(this.container);
    document.getElementById("blocks-gui").style.display = "none";
  }

  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }

  highlightMovableBlocks() {
    for(const blockGraphic of this.blocksContainer.children) {
      if(this.canMoveBlock(pixelPosToGridPos(blockGraphic.position))) {
        this.highlightedBlocks.add(blockGraphic);
      }
    }
  }

  unhighlightMovableBlocks() {
    for(const blockGraphic of this.blocksContainer.children) {
      if(this.canMoveBlock(pixelPosToGridPos(blockGraphic.position))) {
        this.unhighlightBlock(blockGraphic);
      }
    }
  }

  unhighlightBlock(blockGraphic) {
    this.highlightedBlocks.delete(blockGraphic);
    drawBlock(blockGraphic, BLOCK_COLOR);
  }

  onPointerDown(e) {
    this.draggingBlock = e.currentTarget;

    // Reorder so this block is on top
    this.blocksContainer.setChildIndex(this.draggingBlock, this.blocksContainer.children.length - 1);

    const gridPos = pixelPosToGridPos(this.draggingBlock.position);
    this.blockGrid = removeFromArray(this.blockGrid, gridPos);

    this.highlightedBlocks.add(this.draggingBlock);
  }

  onPointerUp(e) {
    if(!this.draggingBlock) return;


    this.dropBlock(this.draggingBlock, this.draggingBlock.position);

    this.unhighlightBlock(this.draggingBlock);

    this.draggingBlock = null;
    this.updateBlocks();

    document.getElementById("add-shape").disabled = false;

    this.emit("droppedBlock");
  }

  onPointerMove(e) {
    if(!this.draggingBlock) return;

    this.draggingBlock.position = subtract(e.data.getLocalPosition(app.stage), this.blocksContainer.position);
  }

  updateBlocks() {
    this.updateTargetBlockContainerPosition();
    this.updateBlockInteractivity();
  }

  updateTargetBlockContainerPosition() {
    const centerPos = new PIXI.Point(app.view.width / 2, app.view.height / 2);
    const oldBlockPositions = this.blocksContainer.children.map(c => c.position);
    const minBlockPos = min.apply(null, oldBlockPositions);
    const maxBlockPos = max.apply(null, oldBlockPositions);
    const blockCenterPos = average(minBlockPos, maxBlockPos);
    this.targetBlockContainerPosition = subtract(centerPos, blockCenterPos);
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

    document.getElementById("end-early-message").style.display = "none";
    document.getElementById("add-shape").disabled = true;

    this.emit("addedShape");
  }

  onAttemptDone() {
    if(galleryShapes.length < 5) 
      document.getElementById("end-early-message").style.display = "block";
    else
      document.getElementById("modal-confirm-done").style.display = "block";
  }

  cancelModal() {
    document.getElementById("modal-confirm-done").style.display = "none";
  }

  confirmDone() {
    this.done = true;

    searchScore = calculateSearchScore()
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

      this.updateDoneButton();
    }
  }

  update(timeSinceStart) {
    if(this.done) searchScore = calculateSearchScore(galleryShapes.length, timeSinceStart);
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
    
    shape.beginFill(isSelected ? 0x9B2526 : 0x333333);
    shape.drawRect(-40, -40, 80, 80);
    shape.endFill();

    this.updateDoneButton();
  }

  updateDoneButton() {
    document.getElementById("done-selection").style.display = this.selectedIndexes.length == 5 ? "block" : "none";
  }
}


class ResultsScene extends Entity {
  setup() {
    this.container = new PIXI.Container();
    sceneLayer.addChild(this.container);

    const slider = new PIXI.Sprite(app.loader.resources["images/slider.png"].texture);
    slider.anchor.set(0.5);
    slider.position.set(app.renderer.width / 2, 145);
    this.container.addChild(slider);

    const ball = new PIXI.Graphics();
    ball.beginFill(0x2CC62C);
    ball.drawCircle(app.renderer.width / 2 + searchScore * 255, 120, 10);
    this.container.addChild(ball);

    document.getElementById("results-gui").style.display = "block";
    if(searchScore > 0) {
      document.getElementById("rapid-search-text").style.display = "block";
    } else {
      document.getElementById("focused-search-text").style.display = "block";
    }

    const searchScorePercent = Math.round(Math.abs(searchScore) * 100);
    for(let el of document.getElementsByClassName("searchScorePercent")) {
      el.innerText = searchScorePercent;
    }

    document.getElementById("code").innerText = redmetricsId;
  }

  teardown() {
    document.getElementById("results-gui").style.display = "none";
    sceneLayer.removeChild(this.container);
  }  
}


const app = new PIXI.Application({
  width: 960,
  height: 540,
  view: document.getElementById("pixi-canvas")
});


app.loader
  .add(["images/slider.png"])
  .on("progress", loadProgressHandler)
  .load(setup);


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



const scenes = {
  intro: IntroScene,
  training: TrainingScene,
  block: BlockScene,
  gallery: GalleryScene,
  results: ResultsScene
};

const sceneTransitions = {
  intro: "training",
  training: "block",
  block: "gallery",
  gallery: "results",
};


const defaultStartingScene = "intro";

let sceneLayer;

function setup() {
  sceneLayer = new PIXI.Container();
  app.stage.addChild(sceneLayer);

  app.ticker.add(update);

  // Start scene
  changeScene(getStartingScene(defaultStartingScene));
}

let currentScene;
let currentSceneName;
let sceneStartedAt = 0;

function changeScene(newSceneName) {
  if(currentScene) currentScene.teardown();

  currentSceneName = newSceneName;  
  currentScene = new scenes[currentSceneName];

  sceneStartedAt = Date.now();
  currentScene.setup();
  currentScene.update(0);
}

function update(timeScale)
{
  const timeSinceStart = Date.now() - sceneStartedAt;
  currentScene.update(timeSinceStart, timeScale);

  const requestedTransition = currentScene.requestedTransition(timeSinceStart);
  if(requestedTransition != null) {
      const nextSceneName = provideNextScene(sceneTransitions, currentSceneName, requestedTransition);
      if(nextSceneName != null) changeScene(nextSceneName);
  }
  app.renderer.render(app.stage);
}


