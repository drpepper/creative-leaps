import "../node_modules/babel-polyfill/dist/polyfill.js";
import "../node_modules/url-search-params-polyfill/index.js";

import * as util from "./util.js";


const EPSILON = 0.001;
const BLOCK_WIDTH = 50;
const MAX_SEARCH_TIME = 12 * 60 * 1000;
const BLOCK_COLOR = 0x81e700;
const HIGHLIGHTED_BLOCK_COLOR = 0x59853b;
const DRAG_HIGHLIGHT_PERIOD = 500;
// const RED_METRICS_HOST = "api.creativeforagingtask.com";
// const RED_METRICS_GAME_VERSION = "7f8d4b44-2903-4b05-b019-0499d4ed0149";
const RED_METRICS_HOST = "localhost";
const RED_METRICS_API_KEY = "390a0522-1cd5-4d7f-a7b2-94c8e19fd790";


function gridPosToPixelPos(gridPos) {
  return util.multiply(gridPos, BLOCK_WIDTH);
}

function pixelPosToGridPos(pixelPos) {
  return util.round(util.divide(pixelPos, BLOCK_WIDTH));
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

function convertShapeToArray(shape) {
  return shape.map(({x, y}) => [x, y]);
}

function pointToArray(p) {
  return [p.x, p.y];
}

function calculateSearchScore(shapeCount, timePlayed) {
  return Math.min(2 * ((1/88) * shapeCount * (720000 / timePlayed) - 0.5), 1);
}

function toggleFullscreen() {
  if(util.inFullscreen()) {
    util.exitFullscreen();
    showFullscreenIcon(true);
  } else {
    util.requestFullscreen(document.getElementById("game-parent"));
    showFullscreenIcon(false);
  }
}

function showFullscreenIcon(full) {
  if(full) {
    document.getElementById("fullscreen-button-small").style.display = "none";
    document.getElementById("fullscreen-button-full").style.display = "block";
  } else {
    document.getElementById("fullscreen-button-small").style.display = "block";
    document.getElementById("fullscreen-button-full").style.display = "none";
  }
}

function loadProgressHandler(loader, resource) {
  console.log("loading: " + resource.url); 
  console.log("progress: " + loader.progress + "%"); 
}

function setup() {
  sceneLayer = new PIXI.Container();
  app.stage.addChild(sceneLayer);

  app.ticker.add(update);

  redmetricsConnection.postEvent({
    type: "start"
  });

  if(util.supportsFullscreen(document.getElementById("game-parent"))) {
    document.getElementById("fullscreen-button").addEventListener("click", toggleFullscreen);
    showFullscreenIcon(true);
  } else {
    document.getElementById("fullscreen-button").style.display = "none";
  }

  // Start scene
  changeScene(util.getStartingScene(defaultStartingScene));
}

function changeScene(newSceneName) {
  if(currentScene) currentScene.teardown();

  currentSceneName = newSceneName;  
  currentScene = new scenes[currentSceneName];

  sceneStartedAt = Date.now();
  currentScene.setup();
  currentScene.update(0);

  redmetricsConnection.postEvent({
    type: metricsStartSceneEvents[newSceneName]
  });
}

function update(timeScale)
{
  const timeSinceStart = Date.now() - sceneStartedAt;
  currentScene.update(timeSinceStart, timeScale);

  const requestedTransition = currentScene.requestedTransition(timeSinceStart);
  if(requestedTransition != null) {
      const nextSceneName = util.provideNextScene(sceneTransitions, currentSceneName, requestedTransition);
      if(nextSceneName != null) changeScene(nextSceneName);
  }
  app.renderer.render(app.stage);
}


class IntroScene extends util.Entity {
  setup() {
    document.getElementById("intro-gui").style.display = "block";

    document.getElementById("user-provided-id").addEventListener("keyup", this.onSetUserProvidedId.bind(this));

    this.done = false;
    document.getElementById("done-intro").disabled = true;
    document.getElementById("done-intro").addEventListener("click", this.onDone.bind(this));
  }

  teardown() {
    document.getElementById("intro-gui").style.display = "none";
  }  

  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }

  onSetUserProvidedId(e) {
    document.getElementById("done-intro").disabled = (document.getElementById("user-provided-id").value.length === 0);

    // If enter key pressed
    if(e.keyCode === 13 && !document.getElementById("done-intro").disabled) {
      this.onDone();
    } 
  }

  onDone() {
    playerData.customData.userProvidedId = document.getElementById("user-provided-id").value;
    redmetricsConnection.updateSession(playerData);

    this.done = true;
  }
}


class TrainingScene extends util.Entity {
  setup() {
    this.done = false;
    this.didDropBlock = false;

    this.blockScene = new BlockScene(true);
    this.blockScene.setup();

    this.blockScene.preventAddingShape = true;
    document.getElementById("add-shape").style.display = "none";
    document.getElementById("done-adding").style.display = "none";

    this.blockScene.on("droppedBlock", this.onDroppedBlock, this);
    this.blockScene.on("addedShape", this.onAddedShape, this);

    document.getElementById("training-gui").style.display = "block";
    document.getElementById("done-training-1").addEventListener("click", this.onDonePart1.bind(this));
    document.getElementById("done-training-2").addEventListener("click", this.onDonePart2.bind(this));
    document.getElementById("done-training-4").addEventListener("click", e => this.done = true);
  }

  update(timeSinceStart) {
    this.blockScene.update(timeSinceStart);
  }

  teardown() {
    this.blockScene.off("droppedBlock", this.onDroppedBlock, this);
    this.blockScene.off("addedShape", this.onAddedShape, this);
    this.blockScene.teardown();

    document.getElementById("done-adding").style.display = "block";
    document.getElementById("training-gui").style.display = "none";
  }

  requestedTransition(timeSinceStart) { return this.done ? "next" : null; }

  onDroppedBlock() {
    if(this.didDropBlock) return;

    this.didDropBlock = true;
    this.blockScene.highlightMovableBlocks();

    document.getElementById("done-training-1").style.display = "block";
  }

  onDonePart1() {
    document.getElementById("training-1").style.display = "none";
    document.getElementById("training-2").style.display = "block";
  }

  onDonePart2() {
    this.blockScene.unhighlightMovableBlocks();

    document.getElementById("training-2").style.display = "none";
    document.getElementById("training-3").style.display = "block";

    document.getElementById("add-shape").style.display = "block";
    this.blockScene.preventAddingShape = false;
  }

  onAddedShape() {
    document.getElementById("training-3").style.display = "none";
    document.getElementById("training-4").style.display = "block";
  }
}


class BlockScene extends util.Entity {
  setup() {
    this.done = false;
    this.draggingBlock = null;
    this.draggingBlockStartGridPosition = null;
    this.startDragTime = null;
    this.highlightedBlocks = new Set();
    this.targetBlockContainerPosition = new PIXI.Point();
    this.lastMouseUpTime = 0;
    this.draggingPointerId = null;
    this.preventAddingShape = false;
    this.timesUp = false;
    this.changedShape = true;

    this.container = new PIXI.Container();
    sceneLayer.addChild(this.container);

    const galleryBg = new PIXI.Graphics();
    galleryBg.beginFill(0x808080);
    galleryBg.lineColor = 0xffffff;
    galleryBg.lineWidth = 1;
    galleryBg.drawRect(0, 0, 150, 150);
    galleryBg.endFill();
    galleryBg.position.set(800, 10);
    galleryBg.on("pointerdown", this.onAddShape, this);
    galleryBg.interactive = true;
    this.container.addChild(galleryBg);

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

    const galleryParent = new PIXI.Container();;
    galleryParent.position.set(875, 85);
    galleryParent.scale.set(0.3);
    this.container.addChild(galleryParent);

    this.galleryLayer = new PIXI.Container();
    galleryParent.addChild(this.galleryLayer);

    // HTML
    document.getElementById("blocks-gui").style.display = "block";

    // This is dumb, but required so that removeEventListener works correctly with bind()
    this.onAddShape = this.onAddShape.bind(this);
    this.onAttemptDone = this.onAttemptDone.bind(this);
    this.cancelModal = this.cancelModal.bind(this);
    this.confirmDone = this.confirmDone.bind(this);
    document.getElementById("add-shape").addEventListener("click", this.onAddShape);
    document.getElementById("modal-confirm-cancel-button").addEventListener("click", this.cancelModal);
    document.getElementById("modal-confirm-done-button").addEventListener("click", this.confirmDone);

    // Don't allow player to leave early if allowEarlyExit is false
    const doneAddingButton = document.getElementById("done-adding");
    doneAddingButton.addEventListener("click", this.onAttemptDone);
    doneAddingButton.disabled = !allowEarlyExit;
  }

  update(timeSinceStart) {
    if(this.timesUp) return;


    if(timeSinceStart > MAX_SEARCH_TIME) {
      this.timesUp = true;

      document.getElementById("add-shape").disabled = true;
      if(galleryShapes.length < 5) {
        document.getElementById("stuck-message").style.display = "block";
        document.getElementById("done-adding").disabled = true;
      } else {
        document.getElementById("continue-message").style.display = "block";
        document.getElementById("done-adding").disabled = false;
      }
    }

    // Animate highlighted blocks
    for(const block of this.highlightedBlocks) {
      const color = util.cyclicLerpColor(BLOCK_COLOR, HIGHLIGHTED_BLOCK_COLOR, 
        (timeSinceStart % DRAG_HIGHLIGHT_PERIOD) / DRAG_HIGHLIGHT_PERIOD);
      drawBlock(block, color);
    }

    if(util.distanceBetween(this.targetBlockContainerPosition, this.blocksContainer.position) > 1)
    {
      this.blocksContainer.position = util.lerp(this.blocksContainer.position, this.targetBlockContainerPosition, 0.5);
    }
  }

  teardown() {
    sceneLayer.removeChild(this.container);
    document.getElementById("blocks-gui").style.display = "none";

    document.getElementById("add-shape").removeEventListener("click", this.onAddShape);
    document.getElementById("done-adding").removeEventListener("click", this.onAttemptDone);
    document.getElementById("modal-confirm-cancel-button").removeEventListener("click", this.cancelModal);
    document.getElementById("modal-confirm-done-button").removeEventListener("click", this.confirmDone);
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
    if(this.draggingBlock) return; // Don't allow multiple drags
    if(this.timesUp) return; // Don't allow drags when time is up


    this.draggingBlock = e.currentTarget;
    this.draggingPointerId = e.data.pointerId; // Keep track of which finger is used 
    this.draggingBlockStartGridPosition = pixelPosToGridPos(this.draggingBlock.position);
    this.startDragTime = Date.now();

    // Reorder so this block is on top
    this.blocksContainer.setChildIndex(this.draggingBlock, this.blocksContainer.children.length - 1);

    const gridPos = pixelPosToGridPos(this.draggingBlock.position);
    this.blockGrid = util.removeFromArray(this.blockGrid, gridPos);

    this.highlightedBlocks.add(this.draggingBlock);

    // Disable html buttons
    document.getElementById("html-layer").className = "no-pointer-events";
  }

  onPointerUp(e) {
    if(!this.draggingBlock) return;

    this.dropBlock(this.draggingBlock, this.draggingBlock.position);

    this.unhighlightBlock(this.draggingBlock);

    this.draggingBlock = null;
    this.draggingPointerId = null;
    this.updateBlocks();

    document.getElementById("add-shape").disabled = false;
    this.changedShape = true;

    // Re-enable html buttons
    document.getElementById("html-layer").className = "";

    this.emit("droppedBlock");
  }

  onPointerMove(e) {
    if(!this.draggingBlock) return;
    if(e.data.pointerId !== this.draggingPointerId) return;


    this.draggingBlock.position = util.subtract(e.data.getLocalPosition(app.stage), this.blocksContainer.position);
  }

  updateBlocks() {
    this.updateTargetBlockContainerPosition();
    this.updateBlockInteractivity();
  }

  updateTargetBlockContainerPosition() {
    const centerPos = new PIXI.Point(app.view.width / 2, app.view.height / 2);
    const oldBlockPositions = this.blocksContainer.children.map(c => c.position);
    const minBlockPos = util.min.apply(null, oldBlockPositions);
    const maxBlockPos = util.max.apply(null, oldBlockPositions);
    const blockCenterPos = util.average(minBlockPos, maxBlockPos);
    this.targetBlockContainerPosition = util.subtract(centerPos, blockCenterPos);
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
    const closestGridPos = _.min(freeGridPositions, freePos => util.distance(gridPos, freePos));
    
    block.position = gridPosToPixelPos(closestGridPos);
    this.blockGrid.push(closestGridPos);

    this.lastMouseUpTime = Date.now();
    redmetricsConnection.postEvent({
      type: "movedBlock",
      customData: {
        startPosition: pointToArray(this.draggingBlockStartGridPosition),
        endPosition: pointToArray(closestGridPos),
        time: Date.now() - this.startDragTime,
        newShape: convertShapeToArray(this.blockGrid)
      }
    });
  }

  findFreeGridPositions() {
    var ret = [];
    for(let b of this.blockGrid) {
      ret.push(new PIXI.Point(b.x - 1, b.y));
      ret.push(new PIXI.Point(b.x + 1, b.y));
      ret.push(new PIXI.Point(b.x, b.y - 1));
      ret.push(new PIXI.Point(b.x, b.y + 1));
    }
    ret = util.uniq(ret);
    return util.difference(ret, this.blockGrid);
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
    let blocksWithout = util.removeFromArray(this.blockGrid, gridPos);
    let adjList = this.makeAdjacencyList(blocksWithout);
    let visited = this.visitBlocks(adjList, [0]);
    return _.flatten(visited).length == blocksWithout.length;
  }

  onAddShape() {
    if(this.preventAddingShape) return;
    if(this.timesUp) return; // Don't allow adding shape when time is up
    if(!this.changedShape) return;
    if(this.draggingBlock) return; // Can't add shape while dragging


    const galleryShape = util.cloneData(this.blockGrid)
    galleryShapes.push(galleryShape);
    this.updateGalleryShape(galleryShape);

    document.getElementById("end-early-message").style.display = "none";
    document.getElementById("add-shape").disabled = true;
    this.changedShape = false;

    redmetricsConnection.postEvent({
      type: "added shape to gallery",
      customData: {
        shape: convertShapeToArray(this.blockGrid),
        timeSinceLastMouseUp: Date.now() - this.lastMouseUpTime
      }
    });

    this.emit("addedShape");
  }

  onAttemptDone() {
    if(this.timesUp || !allowEarlyExit) {
      this.confirmDone();
    } else if(galleryShapes.length < 5) { 
      document.getElementById("end-early-message").style.display = "block";
    } else {
      document.getElementById("modal-confirm-done").style.display = "block";
    }
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
    util.centerContainer(this.galleryLayer, new PIXI.Point());
  }
}

class GalleryScene extends util.Entity {
  setup() {
    const ROWS = 5;
    const COLS = 10;
    const ITEMS_PER_PAGE = ROWS * COLS

    this.done = false;
    this.selectedIndexes = [];
    this.pageNumber = 0;

    this.container = new PIXI.Container();
    sceneLayer.addChild(this.container);

    this.pages = new PIXI.Container();
    this.container.addChild(this.pages);

    let pageContainer;
    for(let i = 0; i < galleryShapes.length; i++) {
      const page = Math.floor(i / ITEMS_PER_PAGE);
      const row = Math.floor((i % ITEMS_PER_PAGE) / COLS); 
      const col = Math.floor((i % ITEMS_PER_PAGE) % COLS);

      // Make new page if necessary
      if(i % (ROWS * COLS) == 0) {
        pageContainer = new PIXI.Container();
        pageContainer.visible = false;
        this.pages.addChild(pageContainer);
      }
      const galleryShapeCenter = new PIXI.Point(70 + col * 90, 95 + row * 85);

      const galleryBg = new PIXI.Graphics();
      galleryBg.beginFill(0x333333);
      galleryBg.drawRect(-40, -40, 80, 80);
      galleryBg.endFill();
      galleryBg.position = galleryShapeCenter;
      pageContainer.addChild(galleryBg);

      galleryBg.on("pointerdown", e => this.onToggleShape(galleryBg, i));
      galleryBg.buttonMode = true;
      galleryBg.interactive = true;

      const galleryParent = new PIXI.Container();
      galleryParent.position = galleryShapeCenter;
      galleryParent.scale.set(0.1);
      pageContainer.addChild(galleryParent);

      const galleryLayer = new PIXI.Container();
      for(let block of galleryShapes[i])
        galleryLayer.addChild(makeBlockShape(block));
      util.centerContainer(galleryLayer, new PIXI.Point());
      galleryParent.addChild(galleryLayer);
    }

    // HTML
    document.getElementById("selection-gui").style.display = "block";
    document.getElementById("done-selection").addEventListener("click", this.onDoneSelection.bind(this));
    document.getElementById("previous-page-button").addEventListener("click", e => this.changePage(this.pageNumber - 1));
    document.getElementById("next-page-button").addEventListener("click", e => this.changePage(this.pageNumber + 1));

    this.updateDoneButton();

    this.changePage(0);
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
    else this.selectedIndexes = util.removeFromArray(this.selectedIndexes, shapeIndex); 
    
    shape.beginFill(isSelected ? 0x9B2526 : 0x333333);
    shape.drawRect(-40, -40, 80, 80);
    shape.endFill();

    this.updateDoneButton();

    redmetricsConnection.postEvent({
      type: "selected shape",
      customData: {
        shapeIndex: shapeIndex,
        shape: convertShapeToArray(galleryShapes[shapeIndex]),
        isSelected: isSelected,
      }
    });
  }

  updateDoneButton() {
    document.getElementById("done-selection").disabled = this.selectedIndexes.length != 5;
  }

  changePage(newPageNumber) {
    this.pages.children[this.pageNumber].visible = false;

    this.pageNumber = newPageNumber;
    this.pages.children[this.pageNumber].visible = true;
    document.getElementById("previous-page-button").disabled = this.pageNumber == 0;
    document.getElementById("next-page-button").disabled = this.pageNumber == (this.pages.children.length - 1);
  }

  onDoneSelection() {
    const selectedShapes = _.map(this.selectedIndexes, index => convertShapeToArray(galleryShapes[index]));

    redmetricsConnection.postEvent({
      type: "done selection",
      customData: {
        shapeIndices: this.selectedIndexes,
        shapes: selectedShapes
      }
    });

    this.done = true;
  }
}


class ResultsScene extends util.Entity {
  setup() {
    this.container = new PIXI.Container();
    sceneLayer.addChild(this.container);

    document.getElementById("results-gui").style.display = "block";

    if(!showResults) {
      document.getElementById("results-block").style.display = "none";
    } else {
      document.getElementById("thanks-block").style.display = "none";

      const slider = new PIXI.Sprite(app.loader.resources["images/slider.png"].texture);
      slider.anchor.set(0.5);
      slider.position.set(app.renderer.width / 2, 145);
      this.container.addChild(slider);

      const ball = new PIXI.Graphics();
      ball.beginFill(0x2CC62C);
      ball.drawCircle(app.renderer.width / 2 + searchScore * 255, 120, 10);
      this.container.addChild(ball);

      if(searchScore > 0) {
        document.getElementById("rapid-search-text").style.display = "block";
      } else {
        document.getElementById("focused-search-text").style.display = "block";
      }

      const searchScorePercent = Math.round(Math.abs(searchScore) * 100);
      for(let el of document.getElementsByClassName("searchScorePercent")) {
        el.innerText = searchScorePercent;
      }

      document.getElementById("code").innerText = redmetricsConnection.sessionId ? 
        redmetricsConnection.sessionId.substr(-8) : "Unknown";

      // Setup followup link
      if(searchParams.has("followupLink")) {
        const expId = searchParams.get("expId") || searchParams.get("expID") || "";
        const userId = searchParams.get("userId") || searchParams.get("userID") || "";
        const metricsId = redmetricsConnection.playerId || "";
        const userProvidedId = playerData.customData.userProvidedId || "";

        var link = searchParams.get("followupLink");
        if(!_.contains(link, "?")) link += "?";
        link += "&IDExp=" + expId 
          + "&IDUser=" + userId
          + "&IDMetrics=" + metricsId
          + "&IDUserProvided=" + userProvidedId;
        document.getElementById("followup-link").href = link;
      } else {
        document.getElementById("followup-link-container").style.display = "none";
      }
    }
  }

  teardown() {
    document.getElementById("results-gui").style.display = "none";
    sceneLayer.removeChild(this.container);
  }  
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

const metricsStartSceneEvents = {
  intro: "startIntro",
  training: "startTutorial",
  block: "startSearch",
  gallery: "end search",
  results: "startFeedback"
};

const searchParams = new URLSearchParams(window.location.search);
const allowEarlyExit = searchParams.get("allowEarlyExit") !== "false" && searchParams.get("allowEarlyExit") !== "0";
const showResults = searchParams.get("showResults") !== "false" && searchParams.get("showResults") !== "0";
const apiKey = searchParams.get("apiKey") || RED_METRICS_API_KEY;

let galleryShapes = [];
let searchScore = 0.33;
let redmetricsConnection;
const defaultStartingScene = "intro";
let sceneLayer;
let currentScene;
let currentSceneName;
let sceneStartedAt = 0;

const app = new PIXI.Application({
  width: 960,
  height: 540,
  view: document.getElementById("pixi-canvas"),
  antialias: true
});

app.loader
  .add(["images/slider.png"])
  .on("progress", loadProgressHandler)
  .load(setup);

// Load RedMetrics
let playerData = {
  externalId: searchParams.get("userId") || searchParams.get("userID"),
  customData: {
    expId: searchParams.get("expId") || searchParams.get("expID"),
    userId: searchParams.get("userId") || searchParams.get("userID"),
    userAgent: navigator.userAgent
  }
};

redmetricsConnection = new rm2.WriteConnection({ 
  host: RED_METRICS_HOST,
  apiKey: apiKey,
  session: playerData
});
redmetricsConnection.connect().then(function() {
  console.log("Connected to the RedMetrics server");
});

// Resize
util.resizeGame(app);
window.addEventListener("resize", () => util.resizeGame(app));

// // Debugging code
// for(let i = 0; i < 120; i++) {
//   galleryShapes.push([{"x":1,"y":0},{"x":2,"y":0},{"x":3,"y":0},{"x":4,"y":0},{"x":5,"y":0},{"x":6,"y":0},{"x":7,"y":0},{"x":8,"y":0},{"x":9,"y":0},{"x":1,"y":-1}]);
// }

