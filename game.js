/*
  TODO: 
    - use query params to give the starting scene

    - sound effects
    subtitles = load file with ID: text li"ne
    one file per language

    audio: one long track, with exported markers on IDs to start times and lengths
    - transition from logo by finding solution to puzzle (make left and right appear)


  SCRIPT
    Americans love bananas
    In 2015, an average Americans ate 14 oranges, and 32 apples.
    Guess how many bananas they ate?
    -> That's right. 46 bananas, as many apples and oranges combined. 

    // reference : http://www.pbhfoundation.org/pdfs/about/res/pbh_res/State_of_the_Plate_2015_WEB_Bookmarked.pdf

    most bananas will die...
    we eat so many bananas, how is this possible?
    show logo
    what are fruit?
      fruit are a way for plants to get animals to spread their seeds - "say you're a plant and you want to spread your seeds"
      there are other ways to spread seeds of course: wind and water
      but fruit takes advantage of animals, pwhich bring the seeds far and wide, and deposit them in "fertaliser"
      trick is:
        fruit must be tasty (e.g. lots of sugar)
        that seeds must be tough enough to survive digestion
          (in fact there are fruit that have really big seeds that no animals eat anymore)

    most fruit was changed through agriculture
      ex. game where you pick the best species and cross them 
      match up original fruit against their modern counterparts
      use a slider to see how it changes over time?

    fruit has seeds, banana is fruit, so where are the seeds?
    in fact they are there but we take them out using hybridization
      explain genetics of diploid / tetraploid
      revisit previous game but with hybrid approach
    result is it's more difficult to improve over time, and more susceptible to disease
      return to farm game, this time disease hits
        your polyculture plants survived (from 1st game time)
        but your monoculture bananas die
    this is what happened to the gros michel banana
      similar things happened in the potato famine
    and reports are that the panana disease is adapting to the cavendish
    what could happen now?
      hybrids (diffocult)
      genetic engineering (unpopular)
    or we embrace diversity - other bananas exist


  NOTES
    recent study links larger brains in primates to those who eat fruit rather than leaves



*/

const appSize = [800, 600];

const DEBUG_PHYSICS = false;

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

class SubtitleRunner {
  // Takes array of [time, text]
  constructor(subtitlesAndTimes) {
    this.subtitlesAndTimes = subtitlesAndTimes;
  }

  setup() { 
    this.index = -1;

    changeSubtitle(); 
  }

  update(timeSinceStart, timeScale) {
    if(this.index >= this.subtitlesAndTimes.length - 1) return;

    if(this.subtitlesAndTimes[this.index + 1][0] <= timeSinceStart) {
      this.index++;
      changeSubtitle(this.subtitlesAndTimes[this.index][1]);
    }
  }

  teardown() { changeSubtitle(); }

  requestedTransition(timeSinceStart) { 
    return this.index >= this.subtitlesAndTimes.length - 1 ? "next" : null; 
  } 
}


function makeSprite(name) { 
  return new PIXI.Sprite(app.loader.resources[name].texture);
}

function randomPos() {
  return [appSize[0] * Math.random(), appSize[1] * Math.random()];
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

function moveTowards(a, b, speed) {
  const d = distanceBetween(a, b);
  return lerp(a, b, clamp(speed / d, 0, 1));
}

const EPSILON = 0.001;


class IntroScene extends Entity {
  setup() {
    this.engine = Matter.Engine.create();
    
    if(DEBUG_PHYSICS) {
      var render = Matter.Render.create({
          element: document.body,
          engine: this.engine
      });

      Matter.Render.run(render);      
    }
    
    const ground = Matter.Bodies.rectangle(400, 610, 810, 60, { isStatic: true });
    const leftWall = Matter.Bodies.rectangle(0, appSize[1] / 2, 60, appSize[1], { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(appSize[0], appSize[1] / 2, 60, appSize[1], { isStatic: true });
    Matter.World.add(this.engine.world, [ground, leftWall, rightWall]);

    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.width = appSize[0];
    this.container.height = appSize[1];
    sceneLayer.addChild(this.container);

    let rectangle = new PIXI.Graphics();
    //rectangle.lineStyle(4, 0xFF3300, 1);
    rectangle.beginFill("black");
    rectangle.drawRect(0, 0, appSize[0], appSize[1]);
    rectangle.endFill();
    rectangle.interactive = true;
    rectangle.on("pointertap", () => { this.onClick(); }); // TODO: use bind() instead?
    rectangle.on("pointermove", (e) => { this.onMove(e); })
    this.container.addChild(rectangle);

    // Phases are beforeOrange, orange, beforeApple, apple, beforeBanana, banana, eat, outro, done
    this.phase = "beforeOrange";
    this.orangeCount = 0;
    this.appleCount = 0;
    this.bananaCount = 0;
    this.lastFruitTime = 0;

    // Matching arrays of bodies and their sprites
    this.bodies = [];
    this.sprites = [];

    changeSubtitle("Americans love bananas.\nIn 2015, an average Americans ate");
  }

  randomDropPos() {
    return [(0.1 + 0.8 * Math.random()) * appSize[0], appSize[1] * -0.1];
  }

  update(timeSinceStart, timeScale) {
    switch(this.phase) {
      case "orange":
        if(this.orangeCount >= 14) {
          this.phase = "beforeApple";
        } else if(this.lastFruitTime + 500 < timeSinceStart) {
          this.makeOrange(this.randomDropPos());
          this.orangeCount++;
          this.lastFruitTime = timeSinceStart;
        }
        break;

      case "apple":
        if(this.appleCount >= 32) {
          this.phase = "beforeBanana";
        } else if(this.lastFruitTime + 300 < timeSinceStart) {
          this.makeApple(this.randomDropPos());
          this.appleCount++;
          this.lastFruitTime = timeSinceStart;
        }
        break;

      case "banana":
        if(this.bananaCount >= 46) {
          this.phase = "eat";

          this.makeMouth();
          changeSubtitle("And yet, scientists say that soon, most bananas will be completely gone")
        } else if(this.lastFruitTime + 200 < timeSinceStart) {
          this.makeBanana(this.randomDropPos());
          this.bananaCount++;
          this.lastFruitTime = timeSinceStart;
        }
        break;

      case "eat":
        if(this.sprites.length == this.appleCount + this.orangeCount)
        {
          this.phase = "outro";

          this.container.removeChild(this.mouth);
          changeSubtitle("How could that be possible?")
        }
        else
        {
          // look for the first sprite that is within the mouth size and remove it
          let foundSprite = false;
          for(let i = this.appleCount + this.orangeCount; !foundSprite && i < this.sprites.length; i++) {
            if(distanceBetween(this.sprites[i].position, this.mouth.position) < 75)
            {
              // Remove graphics
              this.container.removeChild(this.sprites[i]);
              this.sprites.splice(i, 1);

              // Remove physics
              Matter.World.remove(this.engine.world, this.bodies[i]);
              this.bodies.splice(i, 1);

              foundSprite = true;
            } 
          }
        }
        break;
    }

    Matter.Engine.update(this.engine, timeScale * 1000 / 60);

    for(let i = 0; i < this.bodies.length; i++)
    {
      const sprite = this.sprites[i];
      const body = this.bodies[i];
      sprite.position.set(body.position.x, body.position.y);
      sprite.rotation = body.angle;
    }
  }

  requestedTransition() { return this.phase == "done" ? "next" : null; }

  onClick(e) {
    switch(this.phase) {
      case "beforeOrange":
        this.phase = "orange";

        changeSubtitle("14 oranges");
        break;

      case "beforeApple":
        this.phase = "apple";

        changeSubtitle("and 32 apples");
        break;

      case "beforeBanana":
        this.phase = "banana";

        changeSubtitle("but a whopping 46 bananas, as many as all those apples and oranges combined");
        break;

      case "outro":
        this.phase = "done";
        break
    }
  }

  onMove(e) {
    switch(this.phase) {
      case "eat":
        this.mouth.position = e.data.getLocalPosition(app.stage);
        break;
    }
  }

  teardown() {
    sceneLayer.removeChild(this.container);
  }

  makeOrange(pos) { 
    const sprite = makeSprite("images/orange.png");
    sprite.scale.set(0.125);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(pos[0], pos[1]);
    this.container.addChild(sprite);

    const body = Matter.Bodies.circle(pos[0], pos[1], 28);
    Matter.World.addBody(this.engine.world, body);
    this.sprites.push(sprite);
    this.bodies.push(body);

    return sprite;
  }

  makeApple(pos) { 
    const sprite = makeSprite("images/apple.png");
    sprite.scale.set(0.125);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(pos[0], pos[1]);
    this.container.addChild(sprite);

    const body = Matter.Bodies.circle(pos[0], pos[1], 28);
    Matter.World.addBody(this.engine.world, body);
    this.sprites.push(sprite);
    this.bodies.push(body);

    return sprite;
  }

  makeBanana(pos) { 
    const sprite = makeSprite("images/banana.png");
    sprite.scale.set(0.05);
    sprite.anchor.set(0.5, 0.5);
    sprite.position.set(pos[0], pos[1]);
    this.container.addChild(sprite);

    const body = Matter.Bodies.rectangle(pos[0], pos[1], 80, 40);
    Matter.World.addBody(this.engine.world, body);
    this.sprites.push(sprite);
    this.bodies.push(body);

    return sprite;
  }

  makeMouth() {
    this.mouth = new PIXI.Graphics();
    this.mouth.lineStyle(4, 0xFFFFFF, 1);
    this.mouth.beginFill("green");
    this.mouth.drawCircle(0, 0, 75);
    this.mouth.endFill();
    this.container.addChild(this.mouth);
  }
}

class LogoScene extends Entity {
  setup() {
    this.subtitleRunner = new SubtitleRunner([
      [0, "This is Play Curious."],
      [2000, "A series of playful interactions about topics ranging from science to history,"],
      [5000, "from design to economics."],
      [7000, "There's a new episode every 2 weeks,"],
      [9000, "so check us out at playcurious.com,"],
      [12000, "and download our phone app so you play as soon as they come out."],
      [14000, "Now back to bananas."],
      [17000, ""],
    ]);
    this.subtitleRunner.setup();


    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.width = appSize[0];
    this.container.height = appSize[1];
    sceneLayer.addChild(this.container);

    this.logo = makeSprite("images/logo.png");

    this.blurFilter = new PIXI.filters.BlurFilter();
    this.blurFilter.blur = 0;

    this.noiseFilter = new PIXI.filters.NoiseFilter();
    this.noiseFilter.noise = 0;

    this.logo.filters = [this.blurFilter, this.noiseFilter];
    this.logo.interactive = true;
    this.logo.on("pointermove", this.onPointerMove.bind(this))
    this.container.addChild(this.logo);

    changeSubtitle();
  }

  update(timeSinceStart, timeScale) {
    this.noiseFilter.seed = Math.random();

    this.subtitleRunner.update(timeSinceStart, timeScale);
  }

  requestedTransition(timeSinceStart) { return  this.subtitleRunner.requestedTransition(); }

  teardown() {
    sceneLayer.removeChild(this.container);
    this.subtitleRunner.teardown();
  }

  onPointerMove(e) {
    const pointerPos = e.data.getLocalPosition(app.stage);
    const xFrac = clamp(pointerPos.x / appSize[0], 0, 1); 
    this.noiseFilter.noise = xFrac;
    const yFrac = clamp(pointerPos.y / appSize[0], 0, 1); 
    this.blurFilter.blur = 20 * yFrac;
  }
}


  //   fruit are a way for plants to get animals to spread their seeds - "say you're a plant and you want to spread your seeds"
  // there are other ways to spread seeds of course: wind and water
  // but fruit takes advantage of animals, pwhich bring the seeds far and wide, and deposit them in "fertaliser"
  // trick is:
  //   fruit must be tasty (e.g. lots of sugar)
  //   that seeds must be tough enough to survive digestion
  //     (in fact there are fruit that have really big seeds that no animals eat anymore)


// TODO; shake the tree to make the seed fall
// TODO: have the tree and fruit shake when you hit them 

class EatingScene extends Entity {
  constructor() {
    super();
    const scene = this;

    const startingSeedPos = new PIXI.Point(249, 221);
    const endingSeedPos = new PIXI.Point(262, 446);
    const seedFallTime = 5000;
    const fruitFallSpeed = 3;

    const startingAnimalPos = new PIXI.Point(600, 446);

    const states = {
      "start": new SubtitleRunner([
        [0, "But first we need to talk about fruit."],
        [2000, "What are fruit anyway?"],
        [4000, "Fruit are simply a clever way for plants to spread their seeds."],
        [6000, "Now, there are simpler ways to spread seeds."],
        [8000, "For example, a plant could just drop them on the ground."],
        [10000, ""]
      ]),
      "seed": new class extends Entity {
        setup() {
          this.didTap = false;

          this.seed = makeSprite("images/seed.png");
          this.seed.anchor.set(0.5);
          this.seed.position = startingSeedPos;
          this.seed.interactive = true;
          this.seed.on("pointertap", () => { this.didTap = true; });
          scene.container.addChild(this.seed);
        }

        update(timeSinceStart, timeScale) {
          this.seed.position = lerp(startingSeedPos, 
            endingSeedPos, 
            clamp(timeSinceStart / seedFallTime, 0, 1));
        }

        teardown() {
          scene.container.removeChild(this.seed);
        }

        requestedTransition(timeSinceStart) { 
          return this.didTap && timeSinceStart >= seedFallTime ? "next" : null; 
        }
      },
      "seedling": new ParallelEntities(
        new class extends Entity {
          setup() {
            this.seedling = makeSprite("images/seedling.png");
            this.seedling.anchor.set(0.5);
            this.seedling.position = endingSeedPos;
            scene.container.addChild(this.seedling);
          }

          teardown() {
            scene.container.removeChild(this.seedling);
          }

          requestedTransition(timeSinceStart) { 
            return timeSinceStart >= 5000 ? "next" : null; 
          }
        },
        new SubtitleRunner([
          [0, "But because the seed is just next to the tree,"],
          [2000, "the new plant will have to fight for light, nutrients, and water."],
          [4000, ""]
        ])
      ),
      "wind": new SubtitleRunner([
        [0, "Some plants use the wind or the water to spread their seeds further."],
        [3000, ""],
      ]),
      "fruit": new class extends Entity {
        setup() {
          this.hitTreeTimes = 0;
          this.lastX = 800;
          this.state = "start"; // states are start, falling, eating, pooping, transitionOut

          this.fruit = makeSprite("images/small fruit.png");
          this.fruit.anchor.set(0.5);
          this.fruit.position = startingSeedPos;
          scene.container.addChild(this.fruit);

          this.animal = makeSprite("images/animal.png");
          this.animal.anchor.set(0.5);
          this.animal.position = startingAnimalPos;
          this.animal.interactive = true;
          this.animal.on("pointerdown", () => this.pointerDown = true);
          this.animal.on("pointerup", () => this.pointerDown = false);
          this.animal.on("pointermove", (e) => {
            if(!this.pointerDown) return;

            const x = e.data.getLocalPosition(app.stage).x;
            if(this.lastX > 275 && x < 275) {
              this.hitTreeTimes++;
              if(this.hitTreeTimes == 3) {
                this.state = "falling";
              }
            }
            this.lastX = x;

            this.animal.position.x = clamp(x, 275, 725);;
          });
          scene.container.addChild(this.animal);
        }

        update() {
          switch(this.state) {
            case "falling":
              this.fruit.position = moveTowards(this.fruit.position, endingSeedPos, fruitFallSpeed);
              if(distanceBetween(this.fruit.position, endingSeedPos) < EPSILON) 
                this.state = "eating";
              break;
            case "eating": 
              if(this.animal.position.x < 300) {
                scene.container.removeChild(this.fruit);
                this.animal.scale.set(-1, 1); // Turn animal around
                
                this.state = "pooping";
              }
              break;
            case "pooping": 
              if(this.animal.position.x > 700) {
                this.poop = makeSprite("images/poop.png");
                this.poop.anchor.set(0.5);
                this.poop.position = startingAnimalPos;
                scene.container.addChild(this.poop);

                scene.container.removeChild(this.animal);

                this.state = "transitionOut";
                break;
            }
          }
        }

        teardown() {
          scene.container.removeChild(this.poop);
        }
      }
    };

    const transitions = {
      "start": {"next": "seed"},
      "seed": {"next": "seedling"},
      "seedling": {"next": "wind"},
      "wind": {"next": "fruit"},
      "fruit": {"next": "end"},
    };

    this.stateMachine = new StateMachine(states, transitions);
  }

  setup() {
    this.container = new PIXI.Container();
    this.container.interactive = true;
    this.container.width = appSize[0];
    this.container.height = appSize[1];
    sceneLayer.addChild(this.container);

    this.background = makeSprite("images/tree scene.png");
    this.container.addChild(this.background);

    this.stateMachine.setup();
  }

  update(timeSinceStart, timeScale) {
    this.stateMachine.update(timeSinceStart, timeScale);
  }

  teardown() {
    this.stateMachine.teardown();
  }
}


function provideNextScene(currentScene, requestedTransition) {
  switch(currentScene.constructor.name) {
    case "IntroScene":
      return new LogoScene();
      break;

    default:
      console.error("No transition from", currentScene, "with transition", requestedTransition);
      return null;
  }
}


const app = new PIXI.Application();
document.body.appendChild(app.view);

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


// Scale canvas on 
scaleToWindow(app.view);

window.addEventListener("resize", function(event){ 
  scaleToWindow(app.view);
});

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
let subtitle;

const defaultStartingScene = "intro";

function getStartingScene() {
  const sceneName = new URL(document.location).searchParams.get("scene") || defaultStartingScene;
  switch(sceneName) {
    case "intro": return new IntroScene();
    case "logo": return new LogoScene();
    case "eating": return new EatingScene();
  } 
}

function setup() {
  sceneLayer = new PIXI.Container();
  app.stage.addChild(sceneLayer);

  subtitle = new PIXI.Text("", {
    fontFamily: "Arial", 
    fontSize: 32, 
    fill: "white",
    strokeThickness: 4,
    align: "center",
    wordWrap: true,
    wordWrapWidth: appSize[0] - 100
  });

  subtitle.anchor.set(0.5, 0.5);

  subtitle.position.set(app.renderer.width / 2, app.renderer.height - 100);
  app.stage.addChild(subtitle); 


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

function changeSubtitle(text) {
  subtitle.text = text;
}

