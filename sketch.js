/* P5.js Absurdist Minigame Generator — “Four-Second Flux”
*/

/* ============================= GLOBAL STATE =============================  */
let gameMode = "game";           // "game" | "transition" | "menu" | "start" | "end" <-- ADDED "end"
const AVAILABLE_MINIS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; 
let currentMini = 1;             // default start
let gameStartMs = 0;             // start time of current game
let transitionStartMs = 0;       // start time of "NEXT!" transition
const GAME_DURATION = 6000;      // 6 seconds per micro-game
const TRANSITION_DURATION = 2000; // “NEXT!” duration

// Sequential toggle (set to true for fixed order; false for random)
let sequentialMode = true;      // fixed order for classroom flow
let seqIndex = 0;               // sequence index

// Menu UI state
let menuRects = [];             // clickable hitboxes
let menuSelIndex = 0;           // keyboard-select index
let menuHoverIndex = -1;        // hover index

// Start screen config & UI
let enableStartScreen = true;   // enable/disable the start screen
let startBtn = { x: 0, y: 0, w: 0, h: 0, hover: false }; // start button rect

// End screen button
let endBtn = { x: 0, y: 0, w: 0, h: 0, hover: false }; // end button rect <-- ADDED

// Configurable GitHub URL for minigame 11 (change to class repo)
const GITHUB_URL = "https://github.com/"; // set to class Repo

// Shared visuals
let baseFont; // reserved if you want custom font later

/* ========================= (AUDIO via p5.sound) ========================= */

let snd = {};                // sound handles
let currentBgMini = null;    // which mini’s BG loop is running

/* === Per-minigame background loops (only the ones you said you have) ===  */
const MINI_BG = { // map: miniId -> filename
  1:  'bg_cloud.m4a',     // Cloud
  3:  'bg_face.mp3',      // Glitchy Face
  6:  'bg_ego.flac',      // Ego Balloon
  8:  'bg_spaghetti.m4a', // Spaghetti
  9:  'bg_form.wav',      // Bureaucratic Maze
  10: 'bg_monty.wav',     // Monty Python
  12: 'bg_legal.mp3'      // Legal Malware (held while pressing SPACE)
}; // no BG for 2,4,5,7,11,13,14,15,16 per your files

// Single NEXT sfx (only one per your request)
const NEXT_SFX_FILE = 'next.wav'; // NEXT! sting

// Squirrel clicks: only two variants per your request
const SQUIRREL_FILES = ['squirrel2.wav', 'squirrel3.wav']; //

// Other SFX you listed and we use
const SFX_FILES = {
  cloud_trimmer_loop: 'cloud_trimmer_loop.mp3', // mower loop
  dog_bite:           'dog_bite.wav',           // dog bite
  dog_hold:           'dog_while_click1wav.wav',// dog purr loop
  ego_hit:            'ego_hit.wav',            // ego poke
  ego_pop:            'ego_pop.wav',            // ego pop
  reset_click:        'reset_click.wav',        // face reset
  spaghetti_ok:       'spaghetti_ok.m4a',       // G correct
  spaghetti_wrong:    'spaghetti_wrong.mp3',    // wrong key
  bong_gavel:         'bong_gavel.wav',         // BONG!
  nudge_bump:         'nudge_bump.mp3',
  separate_whoosh:    'separate_whoosh.mp3',
  denied_form:        'denied_form.wav',        // DENIED
  sausage_click:      'sausage_click.wav',      // sausage add
  turtle_drop:        'turtle_drop.wav',        // (reserved)
  turtle_win:         'turtle_win.wav',         // (reserved)
  monty_stomp:        'monty_stomp.wav',        // stomp impact
  monty_hit:          'monty_hit.wav',          // creature hit
  scream:             'scream.mp3'              // foot on nail
}; //

/* ============================= IMAGES / SPRITES ============================= */
let imgs = {
  tractor: null,   // 'cloud_tractor.png' for mini 1
  foot: null,      // 'foot.webp' fallback foot sprite
  pd: [],          // 'pd1.png','pd2.png','pd3.png' creatures
  leg: null,       // 'leg.png' tall Monty leg sprite
  bgPlay: null,    // 'background_pd.jpg' Monty play background
  bgEnd: null,     // 'endgamebg_pd.jpg' flattened ending bg
  bgHurt: null,    // 'background2_pd.png' hurt ending bg
  nails: []        // 'nail1.png','nail2.png','nail3.png' hazards
}; //

/* =============================== SAFE LOADERS =============================== */
function safeLoadSound(path, assignKey) {
  return loadSound(
    path,
    (s) => { console.log(`[sound] loaded: ${path}`); snd[assignKey] = s; },  // success
    ()  => { console.warn(`[sound] missing or failed: ${path}`); snd[assignKey] = null; } // fail
  );
} //

function preload() {
  // FX
  for (const [k, file] of Object.entries(SFX_FILES)) safeLoadSound(file, k); // preload SFX

  // NEXT! single sfx
  safeLoadSound(NEXT_SFX_FILE, 'next_sfx'); // preload NEXT! sound

  // Squirrel click variations (two files)
  snd.squirrel_clicks = []; // array of squirrel handles
  for (const f of SQUIRREL_FILES) snd.squirrel_clicks.push(safeLoadSound(f, `sq_${f}`)); // keep references

  // Per-minigame BG loops
  for (const [miniId, filename] of Object.entries(MINI_BG)) {
    const key = `bg_${miniId}`;        // bg_1, bg_3, etc.
    safeLoadSound(filename, key);      // e.g., snd.bg_1, snd.bg_3
  }

  // Images for cloud & PD creatures
  imgs.tractor = loadImage('cloud_tractor.png', () => {}, () => {}); // mower sprite (optional)
  imgs.foot    = loadImage('foot.webp',         () => {}, () => {}); // fallback Monty foot
  imgs.pd[0]   = loadImage('pd1.png',           () => {}, () => {}); // PD creature 1
  imgs.pd[1]   = loadImage('pd2.png',           () => {}, () => {}); // PD creature 2
  imgs.pd[2]   = loadImage('pd3.png',           () => {}, () => {}); // PD creature 3

  // Monty-specific art
  imgs.leg    = loadImage('leg.png',            () => {}, () => {}); // tall leg sprite
  imgs.bgPlay = loadImage('background_pd.jpg',  () => {}, () => {}); // play background
  imgs.bgEnd  = loadImage('endgamebg_pd.jpg',   () => {}, () => {}); // flattened ending background
  imgs.bgHurt = loadImage('background2_pd.png', () => {}, () => {}); // hurt ending background

  // Nail variants for Monty
  imgs.nails[0] = loadImage('nail1.png',        () => {}, () => {}); // nail variant 1
  imgs.nails[1] = loadImage('nail2.png',        () => {}, () => {}); // nail variant 2
  imgs.nails[2] = loadImage('nail3.png',        () => {}, () => {}); // nail variant 3
}

/* ====================== BACKGROUND MUSIC HELPERS ====================== */
function playMiniBg(miniId) {
  // For mini 12 (legal), we only play while SPACE is held, so don’t auto-start here
  if (miniId === 12) { stopMiniBg(); return; } // handled inside drawLegalMalware
  stopMiniBg(); // ensure no overlap
  const key = `bg_${miniId}`;           // bg_# lookup
  const s = snd[key];                   // sound handle
  if (s && s.isLoaded && s.isLoaded() && !s.isPlaying()) { s.loop(); s.setVolume(0.45); currentBgMini = miniId; } 
} //

function stopMiniBg() {
  // Stop the current BG if running
  if (currentBgMini != null) {
    const key = `bg_${currentBgMini}`;  // Use currentBgMini, not currentMini
    const s = snd[key];                 // sound handle
    if (s && s.isPlaying()) s.stop();   // stop if running
  }
  currentBgMini = null; // cleared when no BG running
  
  // FIX: Ensure Legal Malware audio (BG 12) is stopped, as it's controlled separately
  const legalBg = snd['bg_12'];
  if (legalBg && legalBg.isPlaying && legalBg.isPlaying()) {
    legalBg.stop();
  }
} //

function playNextSfx() {
  const s = snd.next_sfx; // NEXT! handle
  // FIX: Reduce volume to 50% (0.5)
  if (s && s.isLoaded && s.isLoaded()) {
    s.setVolume(0.1); 
    s.play();
  }
} //
/* ========================= MINIGAME STATE VARS =========================  */
/* 1: Mow the Cloud */
let mowSpots = [];                      // {x,y,r} patches
let prevMouse = { x: null, y: null };   // to detect motion

/* 2: Find the Hidden Noise (Squirrel) */
let noiseClicks = 0;                    // up to 5
let clickPuffs = [];                    // {x,y,kind,when}
let noiseFlashStartMs = 0;              // “SQUIRREL” flash timer
const NOISE_FLASH_TIME = 700;           // ms

/* 3: Glitchy Face Fix */
let faceReset = false;                  // after button
let faceExpression = 0;                 // overlay expression
const FACE_EXPRESSIONS = 6;             // 1..6

/* 4: Tag the Fleeting Motivation (NEW as ID 4) --------------------------- */
let mini4_targetCaught = false;              // whether clicked
let mini4_motPos = { x: 0, y: 0 };           // target position
let mini4_motVel = { x: 0, y: 0 };           // target velocity

/* 5: Sort Abstract Concepts */
let sortedOnce = false;                 // space pressed
let griefPos = { x: 0, y: 0 };          // spiky
let mayoPos = { x: 0, y: 0 };           // smooth
let bongFlashStartMs = -1;              // BONG text flash
const BONG_FLASH_TIME = 450;            // ms

/* 6: Deflate the Ego Balloon */
let egoPopped = false;                  // final state
let egoBaseRadius = 0;                  // radius
let egoHits = 0;                        // clicks to pop
const EGO_HITS_TO_POP = 6;              // threshold
let egoLastHitMs = -1;                  // “pssst!” timer
let egoPopPlayed = false;               // play pop only once

/* 7: Pet the Invisible Dog */
let dogEverPressed = false;             // did player start holding
let dogFailed = false;                  // released early -> true

/* 8: Sentient Spaghetti */
let spaghettiState = "tangle";          // "tangle" | "column" | "angry"
let spaghettiPoints = [];               // wobbly noodle points

/* 9: Bureaucratic Maze (Form) */
let formPos = { x: 0, y: 0 };           // form position
let formVel = { x: 0, y: 0 };           // form velocity
let formSize = { w: 0, h: 0 };          // form size
let denied = false;                     // denied flag
let stamps = [];                        // stamp particles

/* 10: Monty Python Foot Stomp */
let montyTargets = [];                  // array of creatures (pd images)
let footX = 0, footY = 0;               // foot position
let footDown = false;                   // stomping flag
let footScale = 1.0;                    // scale factor (kept for compatibility)
let montyNails = [];                    // moving nail hazards
let montyLives = 3;                     // lives before “hurt” state
let montyHitFlashTimer = 0;             // red flash timer after stepping on a nail

/* 11: The Endless Loop (NEW) --------------------------------------------------- */
let loopBtnPos = { x: 0, y: 0 };       // button position
let loopBtnSize = 0;                  // button diameter
let loopClicks = 0;                   // number of successful clicks
const LOOP_TARGET_CLICKS = 5;         // how many times to break out

/* 12: Legal Malware Text */
let legalSnippets = [];                 // on-screen “legal text” sprites
let legalLastSpawn = 0;                 // last spawn ms
let legalSpawnInterval = 80;            // ms between spawns while not paused

/* 13: Sausage Filler */
let sausageItems = [                    // world-politics “stuffing”
  "CORRUPTION", "HUNGER", "SANCTIONS", "PROPAGANDA",
  "W.M.D.", "SURVEILLANCE", "OLIGARCHS", "DISINFORMATION", "DEBT", "STRESS", "BUREAUCRACY", "INFLUENCERS", "NUKE", "WAR" , "LIFE COACHES" , 
  "SPAM EMAILS", "SCROLLING", "MICROTRANSACTIONS", "CLICKBAIT",
  "FAST FOOD", "ADVERTISING", "ALGORITHMS", "FOMO",
  "COMMUTE", "SUBSCRIPTIONS", "INSTANT GRATIFICATION", "OVERWORK",
  "DATA MINING", "MALWARE", "STAGNATION", "GOSSIP",
  "NOTIFICATIONS", "BURNOUT", "MEETINGS", "MIDLIFE CRISIS",
  "DOOMSCROLLING", "FAKE NEWS", "SURVEILLANCE CAPITALISM", "TERMS OF SERVICE",
  "ADDICTION", "POP-UPS", "EGO", "ANXIETY", "PROCRASTINATION", "PORNOGRAPHY", "POLITICIANS"
]; //
let sausageFills = [];                  // active fly-in labels
let sausageFillCount = 0;               // progress
const SAUSAGE_FILL_TARGET = 8;          // items to fill

/* 14: Checklist of Essential Tasks */
let checklistItems = [];                // [{label, done, x,y,w,h}]

/* 15: Constellation of Doubt */
let constellationStars = [];            // [{x,y,r}] star positions
let constellationLinks = [];            // [{i1,i2}] index pairs
let constellationLastIndex = null;      // index of last clicked star

/* 16: The Essential Loading Bar */
let essentialProgress = 0;              // 0..1 progress
let essentialNudges = 0;                // number of clicks to “help”

/* =============================== SETUP/DRAW ===============================  */
function setup() {
  createCanvas(windowWidth, windowHeight); // responsive canvas
  textFont('sans-serif');                  // chunky via size/bold
  textStyle(BOLD);                         // punchy
  textAlign(CENTER, CENTER);               // center large texts
  if (enableStartScreen) { gameMode = "start"; } else { startNewGame(nextMiniIdForStart()); } // start screen gate
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // responsive resize
}

function draw() {
  background(245, 245, 255); // soft baseline
  // strokeWeight(0); <--- REMOVED FROM HERE!

  if (gameMode === "start") { // start screen branch
    drawStartScreen();        // render start screen
    drawFooterRibbon();       // footer for consistency
    return;                   // stop when in start screen
  } //

  if (gameMode === "end") { // end screen branch <-- ADDED
    drawEndScreen();        // render end screen
    drawFooterRibbon();       // footer for consistency
    return;                   // stop when in end screen
  } //

  if (gameMode === "menu") {             // menu state
    strokeWeight(0); // <-- FIX: Reset strokeWeight before drawing the menu
    drawMenu();                          // draw selectable list
    drawFooterRibbon();                  // footer
    return;                              // stop here when in menu
  }

  if (gameMode === "game") {
    strokeWeight(0); // <-- FIX: Reset strokeWeight before drawing the game
    const elapsed = millis() - gameStartMs; //
    drawGameFrame(elapsed);                 // per-mini draw

    // Objective text (smaller so it never bleeds)
    if (elapsed < 1100) {
      const t = 1 - constrain(elapsed / 1100, 0, 1); // fade-out factor
      push();
      const size = min(width, height) * 0.06;
      textSize(size);
      fill(0, 0, 0, 220 * t);
      stroke(255);
      strokeWeight(2); // <-- keep stroke for text here
      text(getObjectiveText(currentMini), width / 2, height * 0.52);
      pop();
    }

    if (elapsed >= GAME_DURATION) beginTransition(); //
  } else {
    strokeWeight(0); // <-- FIX: Reset strokeWeight before transition
    const tElapsed = millis() - transitionStartMs;   //
    drawTransitionFrame(tElapsed);                   //
    if (tElapsed >= TRANSITION_DURATION) {
      // Check if this was the last minigame in sequential mode
      const isLastMini = sequentialMode && currentMini === AVAILABLE_MINIS[AVAILABLE_MINIS.length - 1];
      if (isLastMini) {
        beginEndScreen(); // <-- START END SCREEN
      } else {
        startNewGame(nextMiniId()); // next mini
      }
    }
  }

  drawFooterRibbon(); // decorative footer
  prevMouse.x = mouseX; prevMouse.y = mouseY; // movement tracker
}

/* ============================= GAME FLOW UTILS =============================  */
function nextMiniIdForStart() {
  if (sequentialMode) { seqIndex = 0; return AVAILABLE_MINIS[seqIndex]; } // reset to first
  return randomMiniDifferentFrom(currentMini); // random start
} //

function nextMiniId() {
  if (sequentialMode) { seqIndex = (seqIndex + 1) % AVAILABLE_MINIS.length; return AVAILABLE_MINIS[seqIndex]; } // cycle
  return randomMiniDifferentFrom(currentMini); // random roll
} //

function startNewGame(nextMini) {
  gameMode = "game";         // enter gameplay
  currentMini = nextMini;    // which mini
  gameStartMs = millis();    // reset timer

  // Stop any loops from prior state
  if (snd.cloud_trimmer_loop && snd.cloud_trimmer_loop.isPlaying()) snd.cloud_trimmer_loop.stop(); // stop mower
  if (snd.dog_hold && snd.dog_hold.isPlaying && snd.dog_hold.isPlaying()) snd.dog_hold.stop();     // stop dog
  stopMiniBg(); // cut BG on switch

  resetMiniState(currentMini); // reset per-mini
  playMiniBg(currentMini);     // start BG if exists/allowed
} //

function beginTransition() {
  gameMode = "transition";      // NEXT! mode
  transitionStartMs = millis(); //

  // Stop loops during NEXT!
  if (snd.cloud_trimmer_loop && snd.cloud_trimmer_loop.isPlaying()) snd.cloud_trimmer_loop.stop(); // mower off
  if (snd.dog_hold && snd.dog_hold.isPlaying && snd.dog_hold.isPlaying()) snd.dog_hold.stop();     // dog off
  stopMiniBg();        // BG cuts immediately
  playNextSfx();       // single NEXT sound
} //

// NEW FUNCTION: Start the End Screen
function beginEndScreen() {
  gameMode = "end";
  // Final state cleanup if needed
  stopMiniBg();
  if (snd.cloud_trimmer_loop && snd.cloud_trimmer_loop.isPlaying()) snd.cloud_trimmer_loop.stop();
  if (snd.dog_hold && snd.dog_hold.isPlaying && snd.dog_hold.isPlaying()) snd.dog_hold.stop();
}

function randomMiniDifferentFrom(prev) {
  const pool = AVAILABLE_MINIS.filter(v => v !== prev); // avoid repeat
  return random(pool); // number from pool
} //

function getObjectiveText(mini) {
  if (mini === 1)  return "Practice your pollution."; //
  if (mini === 2)  return "Locate the noise.";                    //
  if (mini === 3)  return "Stop AI from becoming Intelligent."; //
  if (mini === 4)  return "Get your Motivation."; // NEW
  if (mini === 5)  return "Give them Space."; //
  if (mini === 6)  return "Deflate the ego."; //
  if (mini === 7)  return "Pet the Invisible Dog."; //
  if (mini === 8)  return "Only 'G' may pass-ta.";         //
  if (mini === 9)  return "Do not touch it.";         //
  if (mini === 10) return "Smash the civilized."; //
  if (mini === 11) return "BREAK THE LOOP.";// Endless Loop (NEW)
  if (mini === 12) return "Accept the Terms before they accept you."; // Legal
  if (mini === 13) return "Stuff the sausage.";   // Sausage
  if (mini === 14) return ""; // Checklist
  if (mini === 15) return ""; // Constellation
  if (mini === 16) return ""; // Essential bar
  return ""; //
} //

function getMiniName(mini) { // menu friendly names
  if (mini === 1)  return "Pollute the Cloud";               //
  if (mini === 2)  return "Find the Noise";       //
  if (mini === 3)  return "The AI Face";        //
  if (mini === 4)  return "Tag Motivation";     // NEW
  if (mini === 5)  return "Space them";      //
  if (mini === 6)  return "Deflate the Ego";     //
  if (mini === 7)  return "Pet the Invisible Dog";       //
  if (mini === 8)  return "Sentient Spaghetti";          //
  if (mini === 9)  return "Bureaucratic Maze";           //
  if (mini === 10) return "Monty Stomp";            //
  if (mini === 11) return "The Endless Loop";             // Endless Loop (NEW)
  if (mini === 12) return "Legal Malware Text";          //
  if (mini === 13) return "Bad Bad Sausage";           //
  if (mini === 14) return "Checklist";   // NEW checklist
  if (mini === 15) return "Constellation";    // NEW constellation
  if (mini === 16) return "The Loading Bar"; // NEW loading bar
  return `Minigame ${mini}`;                             //
} //

/* ============================= PER-MINI RESETS =============================  */
function resetMiniState(mini) {
  if (mini === 1) {
    mowSpots = []; // clear cloud patches
  } else if (mini === 2) {
    noiseClicks = 0; clickPuffs = []; noiseFlashStartMs = millis(); // reset noise game
  } else if (mini === 3) {
    faceReset = false; faceExpression = 0; // fresh face
  } else if (mini === 4) { // NEW reset for Tag Motivation
    mini4_targetCaught = false;                                     //
    mini4_motPos.x = width * 0.5; mini4_motPos.y = height * 0.5;    //
    const sp = Math.max(5, Math.min(width, height) * 0.012);        //
    const ang = random(TWO_PI);                                     //
    mini4_motVel.x = sp * cos(ang); mini4_motVel.y = sp * sin(ang); //
  } else if (mini === 5) {
    sortedOnce = false; bongFlashStartMs = -1;
    griefPos.x = width * 0.45; griefPos.y = height * 0.5;
    mayoPos.x = width * 0.55;  mayoPos.y = height * 0.5; //
  } else if (mini === 6) {
    egoPopped = false; egoBaseRadius = min(width, height) * 0.25;
    egoHits = 0; egoLastHitMs = -1; egoPopPlayed = false; //
  } else if (mini === 7) {
    dogEverPressed = false; dogFailed = false;
    if (snd.dog_hold && snd.dog_hold.isPlaying && snd.dog_hold.isPlaying()) snd.dog_hold.stop(); // reset dog audio
  } else if (mini === 8) {
    spaghettiState = "tangle"; spaghettiPoints = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      spaghettiPoints.push({
        x: width * 0.35 + random(width * 0.3),
        y: height * 0.35 + random(height * 0.3),
        off: random(TWO_PI)
      });
    } //
  } else if (mini === 9) {
    denied = false; stamps = [];
    formSize.w = min(width, height) * 0.25; formSize.h = min(width, height) * 0.12;
    formPos.x = random(width * 0.2, width * 0.8 - formSize.w);
    formPos.y = random(height * 0.2, height * 0.8 - formSize.h);
    const sp = max(2.2, min(width, height) * 0.0045); const a = random(TWO_PI);
    formVel.x = sp * cos(a); formVel.y = sp * sin(a); //
  } else if (mini === 10) {
    // Creatures (some faster)
    montyTargets = [];                    // reset creatures
    const n = 6;                          // same count as standalone
    for (let i = 0; i < n; i++) {
      let baseSpeed = random(2.0, 3.6);   // default speed
      if (i < 2) baseSpeed = random(4.0, 6.0); // a couple of faster ones

      montyTargets.push({
        img: imgs.pd[i % imgs.pd.length],
        x: random(width * 0.1, width * 0.9),
        y: random(height * 0.4, height * 0.8),
        w: min(width, height) * random(0.10, 0.16),
        h: min(width, height) * random(0.10, 0.16),
        vx: random([-1, 1]) * baseSpeed,
        alive: true
      });
    }

    // Moving nails (hazards)
    montyNails = [];                      // reset nails
    const nailCount = 5;                  // how many nails
    for (let i = 0; i < nailCount; i++) {
      montyNails.push({
        img: imgs.nails.length ? random(imgs.nails) : null,
        x: random(width * 0.05, width * 0.95),
        y: random(height * 0.55, height * 0.85),
        w: min(width, height) * 0.05,
        h: min(width, height) * 0.10,
        vx: random([-1, 1]) * random(2.0, 3.0),
        active: true
      });
    }

    // Foot starts up high (leg mostly off–screen)
    footX = width * 0.75;
    footY = -min(width, height) * 0.2;
    footDown = false;
    footScale = 1.35;

    // Lives & hit flash
    montyLives = 3;
    montyHitFlashTimer = 0;

    // Reset stomp latch state for this mini
    drawMonty.prevFootDown = false;
    drawMonty.stompLatched = false;
    drawMonty.stompCompleted = false;
  } else if (mini === 11) { // NEW reset for The Endless Loop
    loopClicks = 0;                                               // reset click counter
    loopBtnPos.x = width / 2; loopBtnPos.y = height / 2;            // center position
    loopBtnSize = min(width * 0.1, height * 0.1);                   // max size
  } else if (mini === 12) {
    // Clear snippets and reset spawn timing
    legalSnippets = []; legalLastSpawn = millis(); legalSpawnInterval = 80; //
  } else if (mini === 13) {
    sausageFills = []; sausageFillCount = 0; //
  } else if (mini === 14) {
    // Checklist: lay out simple vertical list in center
    const labels = [                           // absurd “essential” tasks
      "REFRESH EMAIL IN CASE OF NEWS",        //
      "AGREE TO UPDATED TERMS",               //
      "MOVE ONE FILE TO ANOTHER FOLDER",      //
      "OPEN PRODUCTIVITY APP, THEN CLOSE IT", //
      "THINK ABOUT HYDRATION"                 //
    ]; //
    checklistItems = [];                      // reset checklist
    const itemCount = labels.length;          // number of lines
    const rowH = min(height * 0.08, 70);      // row height
    const listHeight = rowH * itemCount;      // total height
    const startY = height * 0.5 - listHeight / 2; // centered vertically
    const boxW = min(width * 0.56, 520);      // item width
    const startX = width * 0.5 - boxW / 2;    // centered horizontally

    for (let i = 0; i < itemCount; i++) {
      const y = startY + i * rowH;           // row center Y
      checklistItems.push({
        label: labels[i],
        done: false,
        x: startX,
        y: y - rowH / 2,
        w: boxW,
        h: rowH
      }); //
    }
  } else if (mini === 15) {
    // Constellation: generate scattered stars
    constellationStars = []; constellationLinks = []; constellationLastIndex = null; // reset
    const starCount = 10;                        // number of points
    const margin = min(width, height) * 0.12;    // keep away from edges
    for (let i = 0; i < starCount; i++) {
      constellationStars.push({
        x: random(margin, width - margin),
        y: random(margin, height - margin),
        r: min(width, height) * 0.01
      }); //
    }
  } else if (mini === 16) {
    // Essential loading bar: reset progress
    essentialProgress = 0;           // clear progress
    essentialNudges = 0;             // clear nudges
  }
} //

/* =========================== RENDER TRANSITION ============================  */
function drawTransitionFrame() {
  background(20, 20, 40); // dark
  push();
  const big = min(width, height) * 0.12;
  textSize(big);
  const c = color(
    180 + 75 * sin(frameCount * 0.3),
    100 + 155 * sin(frameCount * 0.5 + 1.2),
    240
  );
  fill(c);
  stroke(255);
  strokeWeight(2);
  text("NEXT!", width / 2, height / 2);
  pop();
} //

/* ============================ DRAW GAME FRAME ============================  */
function drawGameFrame(elapsed) {
  if      (currentMini === 1)  drawMowCloud(elapsed);        //
  else if (currentMini === 2)  drawFindNoise(elapsed);       //
  else if (currentMini === 3)  drawGlitchyFace(elapsed);     //
  else if (currentMini === 4)  drawMini4_TagMotivation(elapsed); // NEW
  else if (currentMini === 5)  drawSortAbstract(elapsed);    //
  else if (currentMini === 6)  drawDeflateEgo(elapsed);      //
  else if (currentMini === 7)  drawInvisibleDog(elapsed);    //
  else if (currentMini === 8)  drawSpaghetti(elapsed);       //
  else if (currentMini === 9)  drawFormMaze(elapsed);        //
  else if (currentMini === 10) drawMonty(elapsed);           //
  else if (currentMini === 11) drawMini11_EndlessLoop(elapsed); // NEW
  else if (currentMini === 12) drawLegalMalware(elapsed);    // NEW
  else if (currentMini === 13) drawSausage(elapsed);         // NEW
  else if (currentMini === 14) drawChecklist(elapsed);       // NEW checklist
  else if (currentMini === 15) drawConstellation(elapsed);   // NEW constellation
  else if (currentMini === 16) drawEssentialLoading(elapsed);// NEW essential bar
} //

/* ==================== START SCREEN (NEW) ==================== */
function drawStartScreen() { // renders title and start button
  background(18, 22, 38); // deep blue

  // Title
  push(); textAlign(CENTER, CENTER); textSize(min(width, height) * 0.07); fill(255); stroke(0); strokeWeight(3);
  text("Nonsense Games by Joao de Mendonca Salim", width / 2, height * 0.35); pop(); //

  // Button sizing & layout (responsive)
  const bw = Math.min(360, width * 0.5);        // button width
  const bh = Math.max(56, Math.min(80, height * 0.09)); // button height
  startBtn.w = bw; startBtn.h = bh;             // store for hit test
  startBtn.x = width / 2 - bw / 2;              // center X
  startBtn.y = height * 0.55 - bh / 2;          // place below title

  // Hover detection
  startBtn.hover = mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.w &&
                   mouseY >= startBtn.y && mouseY <= startBtn.y + startBtn.h; //

  // Draw button
  push();
  noStroke();
  fill(startBtn.hover ? color(80, 220, 150) : color(60, 190, 120)); //
  rect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 14); //
  fill(0); textSize(28); text("Press to Start", startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2); //
  pop();

  // Keyboard hint
  push(); textSize(min(width, height) * 0.03); fill(230);
  text("Press Enter to start", width / 2, startBtn.y + startBtn.h + 40); pop(); //
} //

/* ==================== END SCREEN (NEW) ==================== */
function drawEndScreen() { // renders end title and reset button
  background(18, 22, 38); // deep blue (same as start)

  // Title
  push(); textAlign(CENTER, CENTER); textSize(min(width, height) * 0.07); fill(255, 230, 100); stroke(0); strokeWeight(3);
  text("Thank You For Playing!", width / 2, height * 0.2); pop();

  // Project Description
  push();
  textAlign(CENTER, CENTER);
  textSize(min(width, height) * 0.025);
  fill(230);
  noStroke();
  text("This Flux inspired installation was inspired by WarioWare and Monty Python's Complete Waste of Time games.\n\n" + "This absurdist minigame collection attempts to explore the meaninglessness of modern digital life through short, frantic, and some-what arbitrary tasks.\n\n" + "Games have multiple end states and attempt to provoke critical thought. \nThere is no score, no true failure, only progression through nonsense.", width / 2, height * 0.45);
  pop();

  // Button sizing & layout (responsive)
  const bw = Math.min(360, width * 0.5);        // button width
  const bh = Math.max(56, Math.min(80, height * 0.09)); // button height
  endBtn.w = bw; endBtn.h = bh;             // store for hit test
  endBtn.x = width / 2 - bw / 2;              // center X
  endBtn.y = height * 0.75 - bh / 2;          // place below description

  // Hover detection
  endBtn.hover = mouseX >= endBtn.x && mouseX <= endBtn.x + endBtn.w &&
                   mouseY >= endBtn.y && mouseY <= endBtn.y + endBtn.h; //

  // Draw button
  push();
  noStroke();
  fill(endBtn.hover ? color(255, 100, 100) : color(220, 60, 60)); // Reset button is red
  rect(endBtn.x, endBtn.y, endBtn.w, endBtn.h, 14); //
  fill(255); textSize(28); text("Start Over", endBtn.x + endBtn.w / 2, endBtn.y + endBtn.h / 2); //
  pop();
} //

/* ==================== MINIGAME 1: POLLUTE THE CLOUD (4s-5s) ====================  */
function drawMowCloud(elapsed) {
  background(120, 200, 255); // sky

  // Ground stripe
  noStroke(); fill(60, 180, 90); rect(0, height * 0.8, width, height * 0.2);

  // Puffy cloud
  push();
  const cy = height * 0.33, cx = width * 0.5, baseR = min(width, height) * 0.12;
  noStroke(); fill(200, 220, 240, 140);
  ellipse(cx - baseR, cy + baseR * 0.2, baseR * 2.2, baseR * 1.4);
  ellipse(cx + baseR, cy + baseR * 0.15, baseR * 2.0, baseR * 1.3);
  fill(255);
  ellipse(cx - baseR * 1.3, cy, baseR * 1.9, baseR * 1.6);
  ellipse(cx, cy - baseR * 0.2, baseR * 2.6, baseR * 2.0);
  ellipse(cx + baseR * 1.3, cy + baseR * 0.05, baseR * 2.0, baseR * 1.6);
  pop();

  // Dark “mown” patches
  push(); noStroke();
  for (let s of mowSpots) if (s.y < height * 0.6) { fill(80, 80, 90, 100); ellipse(s.x, s.y, s.r, s.r * 0.8); }
  pop();

  // Red mower cursor
  const mowerSize = max(25, min(width, height) * 0.06);
  const mx = constrain(mouseX, 0, width), my = constrain(mouseY, 0, height);
  const useTractorCursor = false; // toggle true to use imgs.tractor

  push();
  if (imgs.tractor && useTractorCursor) { imageMode(CENTER); image(imgs.tractor, mx, my, mowerSize, mowerSize); }
  else { stroke(0); strokeWeight(2); fill(220, 40, 40); rect(mx - mowerSize/2, my - mowerSize/2, mowerSize, mowerSize, 3);
         fill(0); rect(mx - mowerSize*0.5, my - mowerSize*0.7, mowerSize, mowerSize*0.2, 2); }
  pop();

  if (my < height * 0.6) { mowSpots.push({ x: mx, y: my, r: mowerSize * (0.9 + random(0.2)) }); if (mowSpots.length > 400) mowSpots.shift(); }

  // SOUND: trimmer loop when inside cloud & moving
  if (snd.cloud_trimmer_loop) {
    const inside = my < height * 0.6;
    const moved = (prevMouse.x !== null) ? dist(mx, my, prevMouse.x, prevMouse.y) > 1.5 : false;
    if (inside && moved) { if (!snd.cloud_trimmer_loop.isPlaying()) { snd.cloud_trimmer_loop.loop(); snd.cloud_trimmer_loop.setVolume(0.4); } }
    else { if (snd.cloud_trimmer_loop.isPlaying()) snd.cloud_trimmer_loop.stop(); }
  }
}

/* ================= MINIGAME 2: FIND THE NOISE (4s-5s) =================  */
function drawFindNoise(elapsed) {
  background(255, 35, 190); // neon pink

  if (millis() - noiseFlashStartMs < NOISE_FLASH_TIME) {
    push(); textSize(min(width, height) * 0.06); stroke(255); strokeWeight(2); fill(0);
    text("THE NOISE IS A SQUIRREL", width / 2, height * 0.15); pop();
  }

  push(); textSize(min(width, height) * 0.045); fill(0); stroke(255); strokeWeight(2);
  const remaining = max(0, 5 - noiseClicks);
  text("Click to find the noise.", width / 2, height * 0.85);
  text(`Clicks remaining: ${remaining}`, width / 2, height * 0.9); pop();

  const now = millis(), showFor = 140;
  for (let i = clickPuffs.length - 1; i >= 0; i--) {
    const p = clickPuffs[i];
    if (now - p.when < showFor) drawSillyAt(p.x, p.y, p.kind);
    else clickPuffs.splice(i, 1);
  }

  if (noiseClicks >= 5) {
    push(); const blink = (frameCount % 30) < 15;
    if (blink) { textSize(min(width, height) * 0.07); fill(255); stroke(0); strokeWeight(2);
      text("…THE NOISE WAS INSIDE YOU ALL ALONG…", width / 2, height * 0.5); }
    pop();
  }
}
function drawSillyAt(x, y, kind) {
  push(); translate(x, y); noStroke();
  if (kind === 0) { fill(255); ellipse(0, 0, 28, 20); fill(0); ellipse(3, 0, 8, 8); }
  else if (kind === 1) { fill(255, 230, 80); triangle(-16, 10, 16, 10, -10, -10); fill(210, 170, 50);
    ellipse(-4, -2, 4, 4); ellipse(2, 2, 3, 3); }
  else { fill(255); ellipse(0, 0, 22, 22); fill(0); ellipse(0, 0, 10, 10); stroke(0); strokeWeight(3); line(6, 6, 12, 12); }
  pop();
}

/* ================= MINIGAME 3: THE GLITCHY FACE FIX (4s) =================  */
function drawGlitchyFace(elapsed) {
  background(60, 50, 180); // deep violet

  const faceR = min(width, height) * 0.22;
  const cx = width * 0.5, cy = height * 0.45;

  let faceCol = faceReset ? color(255, 240, 200)
    : color(180 + 75 * sin(frameCount * 0.4), 180 + 75 * sin(frameCount * 0.7 + 1.2), 180 + 75 * sin(frameCount * 0.9 + 0.7));

  push(); noStroke(); fill(faceCol); ellipse(cx, cy, faceR * 1.2, faceR * 1.1); pop();

  if (!faceReset) {
    push(); fill(0); noStroke();
    const dx = 6 * sin(frameCount * 0.6), dy = 4 * cos(frameCount * 0.5);
    ellipse(cx - faceR * 0.25 + dx, cy - faceR * 0.15 + dy, faceR * 0.16, faceR * 0.16);
    ellipse(cx + faceR * 0.25 - dx, cy - faceR * 0.15 - dy, faceR * 0.16, faceR * 0.16); pop();
    push(); noFill(); stroke(0); strokeWeight(3);
    const wob = sin(frameCount * 0.3) * (faceR * 0.1);
    arc(cx, cy + faceR * 0.12, faceR * 0.6, faceR * 0.3 + wob, 0, PI); pop();
  } else {
    push(); stroke(0); strokeWeight(2); noFill();
    ellipse(cx - faceR * 0.25, cy - faceR * 0.15, faceR * 0.22, faceR * 0.22);
    line(cx - faceR * 0.15, cy - faceR * 0.05, cx - faceR * 0.05, cy + faceR * 0.3);
    arc(cx, cy + faceR * 0.18, faceR * 0.55, faceR * 0.25, PI, TWO_PI);
    fill(0); noStroke();
    ellipse(cx - faceR * 0.25, cy - faceR * 0.15, faceR * 0.12, faceR * 0.12);
    ellipse(cx + faceR * 0.25, cy - faceR * 0.15, faceR * 0.12, faceR * 0.12);
    pop();
    drawExtraExpression(faceExpression, cx, cy, faceR); //
  }

  const bw = min(width, 600) * 0.35, bh = 56;
  const bx = width / 2 - bw / 2, by = height * 0.82 - bh / 2;

  push();
  const hovering = mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh;
  fill(hovering ? color(255, 210, 60) : color(255, 180, 40));
  stroke(0); rect(bx, by, bw, bh, 12);
  fill(0); textSize(28); text("FREEZE!", width / 2, by + bh / 2);
  pop();

  push(); textSize(18); fill(255);
  text("", width / 2, by - 24); pop();
}

/* ================= MINIGAME 4: TAG THE FLEETING MOTIVATION (4s) ================ */
function drawMini4_TagMotivation(elapsed) { // NEW
  background(10, 10, 20); // dark stage

  // Move target and bounce
  if (!mini4_targetCaught) {
    mini4_motPos.x += mini4_motVel.x;
    mini4_motPos.y += mini4_motVel.y;
    if (mini4_motPos.x < 20 || mini4_motPos.x > width - 20) mini4_motVel.x *= -1;
    if (mini4_motPos.y < 20 || mini4_motPos.y > height - 20) mini4_motVel.y *= -1;
  }

  // Glowing trail
  push();
  noFill();
  stroke(120, 240, 255, 70);
  strokeWeight(3);
  const trailLen = 10;
  for (let i = 0; i < trailLen; i++) {
    const f = i / trailLen;
    const tx = mini4_motPos.x - mini4_motVel.x * f * 2.5;
    const ty = mini4_motPos.y - mini4_motVel.y * f * 2.5;
    ellipse(tx, ty, 10 - i * 0.7, 10 - i * 0.7);
  }
  pop();

  // Target
  push();
  translate(mini4_motPos.x, mini4_motPos.y);
  noStroke();
  fill(mini4_targetCaught ? color(100, 255, 120) : color(255, 80, 160));
  ellipse(0, 0, 10, 10);
  if (!mini4_targetCaught) {
    fill(255);
    textSize(14);
    text("MOTIVATION", 0, -18);
  } else {
    textSize(26);
    stroke(255);
    fill(0, 255, 160);
    text("GOT IT", 0, -24);
  }
  pop();

  // Helper text
  push();
  textSize(Math.min(width, height) * 0.04);
  stroke(255);
  fill(255);
  text("Motivation Catch-up.", width / 2, height * 0.12);
  pop();
} //

/* ============= MINIGAME 5: Give them Space (4s) ==============  */
function drawSortAbstract(elapsed) {
  background(70, 240, 90);
  stroke(0); strokeWeight(3);
  line(width / 2, height * 0.2, width / 2, height * 0.8);

  push(); noStroke();
  drawSpiky(griefPos.x, griefPos.y, min(width, height) * 0.1, 11, color(240, 40, 40));
  drawLabel("GRIEF", griefPos.x, griefPos.y - min(width, height) * 0.12, 0);
  fill(255, 245, 120); ellipse(mayoPos.x, mayoPos.y, min(width, height) * 0.18, min(width, height) * 0.16);
  fill(255, 255, 200, 180); ellipse(mayoPos.x - 10, mayoPos.y - 10, 20, 12);
  drawLabel("MAYONNAISE", mayoPos.x, mayoPos.y + min(width, height) * 0.12, 0); pop();

  push(); textSize(min(width, height) * 0.045); fill(0); stroke(255); strokeWeight(2);
  text("Give them Space.", width / 2, height * 0.12); pop();

  if (sortedOnce && bongFlashStartMs > 0 && millis() - bongFlashStartMs < BONG_FLASH_TIME) {
    push(); textSize(min(width, height) * 0.16); fill(255); stroke(0); strokeWeight(2);
    text("BONG!", width / 2, height * 0.35); pop();
  }
}
function drawSpiky(x, y, r, spikes, colr) {
  push(); translate(x, y); fill(colr); stroke(0); strokeWeight(2);
  beginShape();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (PI * i) / spikes, rr = (i % 2 === 0) ? r : r * 0.45;
    vertex(cos(ang) * rr, sin(ang) * rr);
  }
  endShape(CLOSE);
  pop();
}
function drawLabel(txt, x, y, rot) {
  push(); translate(x, y); rotate(rot);
  textSize(min(width, height) * 0.05); stroke(255); strokeWeight(2); fill(0);
  text(txt, 0, 0); pop();
}

/* ============== MINIGAME 6: DEFLATE THE EGO BALLOON (4s) ================  */
function drawDeflateEgo(elapsed) {
  background(40, 0, 80); const cx = width * 0.5, cy = height * 0.52;
  if (!egoPopped) egoBaseRadius += 0.35; else {
    egoBaseRadius = lerp(egoBaseRadius, min(width, height) * 0.04, 0.25);
    if (!egoPopPlayed && snd.ego_pop && snd.ego_pop.isLoaded && snd.ego_pop.isLoaded()) { snd.ego_pop.play(); egoPopPlayed = true; }
  }
  const rr = 180 + 75 * sin(frameCount * 0.05), gg = 180 + 75 * sin(frameCount * 0.07 + 1.7), bb = 180 + 75 * sin(frameCount * 0.09 + 0.6);
  noStroke(); for (let i = 5; i >= 1; i--) { fill(rr, gg, bb, 14 * i); ellipse(cx, cy, egoBaseRadius * 2 + i * 14, egoBaseRadius * 2 + i * 14); }
  fill(rr, gg, bb); stroke(255); strokeWeight(2); ellipse(cx, cy, egoBaseRadius * 2, egoBaseRadius * 2);
  if (egoPopped) { push(); stroke(255); strokeWeight(2); for (let i = 0; i < 10; i++) { const a = (TWO_PI * i) / 10 + frameCount * 0.03;
    line(cx, cy, cx + cos(a) * (egoBaseRadius + 30), cy + sin(a) * (egoBaseRadius + 30)); } pop(); }
  if (egoLastHitMs > 0 && millis() - egoLastHitMs < 150) { push(); textSize(min(width, height) * 0.06); stroke(0); strokeWeight(2); fill(255);
    text("pssst!", cx, cy - egoBaseRadius * 0.2); pop(); }
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) { push(); translate(mouseX, mouseY); noStroke(); fill(250);
    triangle(-4, 0, 4, 0, 0, -16); fill(0); rect(-2, -28, 4, 14, 2); pop(); }
  if (!egoPopped && (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height)) egoPopped = true;
}

/* ===================== MINIGAME 7: PET THE INVISIBLE DOG ===================  */
function drawInvisibleDog(elapsed) {
  background(236, 225, 206);
  if (mouseIsPressed && !dogFailed) {
    const r = min(width, height) * (0.06 + 0.01 * sin(frameCount * 0.2));
    push(); noFill(); stroke(255, 200, 80); strokeWeight(2); ellipse(width / 2, height / 2, r, r); pop();
    push(); noStroke(); fill(255, 220, 120, 40); ellipse(width / 2, height / 2, r * 1.4, r * 1.4); pop();
    if (snd.dog_hold && snd.dog_hold.isLoaded && snd.dog_hold.isLoaded()) if (!snd.dog_hold.isPlaying()) snd.dog_hold.loop(); //
  } else { if (snd.dog_hold && snd.dog_hold.isPlaying && snd.dog_hold.isPlaying()) snd.dog_hold.stop(); } //

  if (dogFailed) { const blink = (frameCount % 20) < 12;
    if (blink) { push(); textSize(min(width, height) * 0.12); stroke(0); strokeWeight(2); fill(230, 40, 40); text("HE BIT YOU", width / 2, height * 0.45); pop(); } }

  push(); textSize(min(width, height) * 0.045); stroke(255); strokeWeight(2); fill(0);
  text("Hold the mouse button down for the full duration.", width / 2, height * 0.8); pop();
}

/* ============ MINIGAME 8: ORGANIZE THE SENTIENT SPAGHETTI (4s) ============  */
function drawSpaghetti(elapsed) {
  background(200, 45, 20); // tomato sauce red
  if (spaghettiState === "tangle") {
    noFill(); stroke(230, 170, 60); strokeWeight(5);
    beginShape();
    for (let i = 0; i < spaghettiPoints.length; i++) {
      const p = spaghettiPoints[i];
      const wobX = p.x + 10 * sin(frameCount * 0.05 + p.off);
      const wobY = p.y + 10 * cos(frameCount * 0.06 + p.off);
      curveVertex(wobX, wobY);
    }
    endShape();
  } else if (spaghettiState === "column") {
    stroke(230, 170, 60); strokeWeight(5); const cx = width / 2;
    for (let i = -4; i <= 4; i++) line(cx + i * 8, height * 0.3, cx + i * 8, height * 0.7);
    push(); stroke(0); strokeWeight(5); line(cx - 25, height * 0.72, cx - 10, height * 0.75); line(cx - 10, height * 0.75, cx + 20, height * 0.68); pop();
  } else if (spaghettiState === "angry") {
    push(); translate(width / 2, height / 2); noStroke(); fill(255, 220, 70);
    ellipse(0, 0, min(width, height) * 0.5, min(width, height) * 0.5);
    fill(0); ellipse(-50, -30, 28, 28); ellipse(50, -30, 28, 28);
    noFill(); stroke(0); strokeWeight(2); arc(0, 30, 120, 90, PI, TWO_PI); pop();
  }
  push(); textSize(min(width, height) * 0.045); stroke(255); strokeWeight(2); fill(0);
  text("Press 'G' once. Any other key offends the spaghetti.", width / 2, height * 0.15); pop();
}

/* =========== MINIGAME 9: NAVIGATE THE MAZE (4s) ============  */
function drawFormMaze(elapsed) {
  background(240, 240, 255);
  if (!denied) {
    formPos.x += formVel.x; formPos.y += formVel.y;
    if (formPos.x < 0 || formPos.x + formSize.w > width) formVel.x *= -1;
    if (formPos.y < 0 || formPos.y + formSize.h > height) formVel.y *= -1;
  }
  if (!denied) { push(); fill(220, 40, 40); stroke(0); strokeWeight(2); rect(formPos.x, formPos.y, formSize.w, formSize.h); pop(); }
  else {
    for (let s of stamps) { s.x += s.vx; s.y += s.vy; s.vy += 0.06; push(); translate(s.x, s.y); rotate(s.rot);
      noStroke(); fill(240, 40, 40); rect(-6, -4, 12, 8, 2); fill(60); rect(-2, 4, 4, 8, 1); pop(); s.rot += s.vr; }
    const blink = (frameCount % 20) < 14;
    if (blink) { push(); textSize(min(width, height) * 0.12); stroke(0); strokeWeight(2); fill(255, 60, 60); text("You touched it.", width / 2, height * 0.2); pop(); }
  }
  drawStickPetitioner(mouseX, mouseY);
  if (!denied) {
    if (mouseX >= formPos.x && mouseX <= formPos.x + formSize.w && mouseY >= formPos.y && mouseY <= formPos.y + formSize.h) {
      denied = true;
      const n = 36;
      for (let i = 0; i < n; i++) stamps.push({ x: formPos.x + formSize.w / 2, y: formPos.y + formSize.h / 2, vx: random(-3, 3), vy: random(-3, -0.5), rot: random(TWO_PI), vr: random(-0.1, 0.1) });
      if (snd.denied_form && snd.denied_form.isLoaded && snd.denied_form.isLoaded()) snd.denied_form.play(); //
    }
  }
  push(); textSize(min(width, height) * 0.04); stroke(255); strokeWeight(2); fill(0);
  text("Avoid the moving form. Do not touch it!", width / 2, height * 0.9); pop();
}
function drawStickPetitioner(x, y) {
  push(); translate(x, y); stroke(0); strokeWeight(2);
  fill(255); ellipse(0, -10, 10, 10); line(0, -5, 0, 10);
  line(0, 2, -6, 8); line(0, 2, 6, 8); line(0, 10, -5, 18); line(0, 10, 5, 18); pop();
}

/* =============== MINIGAME 10: MONTY PYTHON FOOT STOMP (4s) =============== */
function drawMonty(elapsed) {
  // Decide background based on state (play / flattened / hurt)
  const anyAlive = montyTargets.some(c => c.alive);           // any creatures left
  let bgImg = imgs.bgPlay;                                    // default play bg
  if (montyLives <= 0 && imgs.bgHurt) bgImg = imgs.bgHurt;    // hurt ending
  else if (!anyAlive && imgs.bgEnd) bgImg = imgs.bgEnd;       // flattened ending

  if (bgImg) {
    image(bgImg, 0, 0, width, height);                        // draw chosen background
  } else {
    background(255, 235, 180);                                // fallback color
  }

  // One-time stomp state init (stored on the function itself)
  if (drawMonty.prevFootDown === undefined) {
    drawMonty.prevFootDown = false;
    drawMonty.stompLatched = false;
    drawMonty.stompCompleted = false;
  }

  const footPressed = footDown && !drawMonty.prevFootDown;    // leading edge of click
  if (footPressed) {
    drawMonty.stompLatched = true;
    drawMonty.stompCompleted = false;
  }
  const stomping = footDown || (drawMonty.stompLatched && !drawMonty.stompCompleted); // latch until bottom

  // Creatures move and slightly avoid the foot horizontally
  for (let c of montyTargets) {
    if (!c.alive) continue;

    const dx = (c.x + c.w / 2) - footX;                       // distance to foot center
    if (abs(dx) < width * 0.25) {                             // only react when foot is near
      c.vx += 0.4 * (dx > 0 ? 1 : -1);                        // push away
      c.vx = constrain(c.vx, -7.5, 7.5);                      // clamp speed
    }

    c.x += c.vx;
    if (c.x < 0) { c.x = 0; c.vx *= -1; }
    if (c.x + c.w > width) { c.x = width - c.w; c.vx *= -1; }
  }

  // Nails drift left/right
  for (let n of montyNails) {
    if (!n.active) continue;
    n.x += n.vx;
    if (n.x < 0 || n.x + n.w > width) n.vx *= -1;
  }

  // Foot horizontal follows mouse
  footX = mouseX;

  // Choose leg sprite, fall back to original foot
  const legSprite = imgs.leg || imgs.foot;

  // Scale leg based on its aspect ratio so it looks tall
  let baseFootW, baseFootH;
  if (legSprite && legSprite.width > 0 && legSprite.height > 0) {
    const aspect = legSprite.height / legSprite.width;        // tall leg -> > 1
    baseFootW = min(width, height) * 0.18;                    // overall width
    baseFootH = baseFootW * aspect;                           // height from aspect
  } else {
    const footScaleFactor = 0.3;
    baseFootW = min(width, height) * 0.55 * footScale * footScaleFactor;
    baseFootH = baseFootW * 0.7;
  }

  // Rest position: ankle around the top edge (leg mostly off-screen)
  const upY = -baseFootH * 0.25;

  // Stomp position: leg fully visible and low enough to hit everything
  const downY = height * 0.65;

  // Vertical corridor where creatures and nails live (so game is winnable)
  const hitTop  = downY - baseFootH * 0.50;
  const hitBot  = downY + baseFootH * 0.25;
  const bandTop = max(0, hitTop);
  const bandBot = min(height, hitBot);

  for (let c of montyTargets) {
    if (!c.alive) continue;
    const maxTop = bandBot - c.h;
    const minTop = bandTop;
    c.y = constrain(c.y, minTop, maxTop);
  }

  for (let n of montyNails) {
    if (!n.active) continue;
    const maxTop = bandBot - n.h;
    const minTop = bandTop;
    n.y = constrain(n.y, minTop, maxTop);
  }

  // Foot vertical animation (lerp between up/down)
  const targetY = stomping ? downY : upY;
  footY = lerp(footY, targetY, stomping ? 0.35 : 0.18);

  if (stomping && footY >= downY - 1) {
    footY = downY;
    drawMonty.stompCompleted = true;                           // stomp finished
  }
  if (!stomping && drawMonty.stompLatched && drawMonty.stompCompleted) {
    drawMonty.stompLatched = false;                            // ready for next stomp
  }
  drawMonty.prevFootDown = footDown;

  // Draw creatures
  for (let c of montyTargets)
    if (c.alive && c.img) image(c.img, c.x, c.y, c.w, c.h);

  // Draw nails
  for (let n of montyNails)
    if (n.active && n.img) image(n.img, n.x, n.y, n.w, n.h);

  // Draw leg/foot (CENTER so it matches collision box)
  if (legSprite) {
    push();
    imageMode(CENTER);
    image(legSprite, footX, footY, baseFootW, baseFootH);
    pop();
  } else {
    push();
    noStroke();
    fill(255, 200, 170);
    ellipse(footX, footY, baseFootW, baseFootH);
    pop();
  }

  // Collision checks only while stomping
  if (stomping) {
    // Stomp creatures
    for (let c of montyTargets) {
      if (!c.alive) continue;
      if (montyOverlap(footX, footY, baseFootW, baseFootH, c.x, c.y, c.w, c.h)) {
        c.alive = false;
        if (snd.monty_hit && snd.monty_hit.isLoaded && snd.monty_hit.isLoaded()) snd.monty_hit.play();
      }
    }

    // Step on nails (lose life + scream)
    for (let n of montyNails) {
      if (!n.active) continue;
      if (montyOverlap(footX, footY, baseFootW, baseFootH, n.x, n.y, n.w, n.h)) {
        n.active = false;
        montyLives = max(0, montyLives - 1);
        montyHitFlashTimer = 220;                             // ms of red flash
        if (snd.scream && snd.scream.isLoaded && snd.scream.isLoaded()) snd.scream.play();
      }
    }
  }

  // Red hit flash overlay when you step on a nail
  if (montyHitFlashTimer > 0) {
    montyHitFlashTimer -= deltaTime;
    push();
    fill(255, 0, 0, 80);
    rect(0, 0, width, height);
    pop();
  }

  // Status text (flattened vs hurt) – purely cosmetic inside the 4s window
  const aliveLeft = montyTargets.filter(c => c.alive).length;
  if (montyLives <= 0) {
    push();
    textSize(min(width, height) * 0.04);
    stroke(0);
    strokeWeight(3);
    fill(255);
    text("AND NOW FOR SOMETHING COMPLETELY HURT", width / 2, height * 0.25);
    pop();
  } else if (aliveLeft === 0) {
    push();
    textSize(min(width, height) * 0.04);
    stroke(0);
    strokeWeight(3);
    fill(255);
    text("AND NOW FOR SOMETHING COMPLETELY FLATTENED", width / 2, height * 0.25);
    pop();
  }

  // Simple lives indicator (3 circles)
  const size = min(width, height) * 0.025;
  const margin = size * 0.6;
  const startX = width - (size + margin) * 3 - margin;
  const y = height * 0.08;
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (size + margin);
    const active = i < montyLives;
    push();
    noStroke();
    fill(active ? color(220, 40, 60) : color(120, 120, 120));
    ellipse(x, y, size, size);
    pop();
  }
}

/* ---- Monty helper: rectangle overlap test ---- */
function montyOverlap(fx, fy, fw, fh, x, y, w, h) { // AABB overlap for Monty leg vs objects
  const fx1 = fx - fw / 2;
  const fx2 = fx + fw / 2;
  const fy1 = fy - fh / 2;
  const fy2 = fy + fh / 2;
  const cx1 = x;
  const cx2 = x + w;
  const cy1 = y;
  const cy2 = y + h;
  return !(fx2 < cx1 || fx1 > cx2 || fy2 < cy1 || fy1 > cy2);
} //

/* ================== MINIGAME 11: THE ENDLESS LOOP (NEW) =================== */
function drawMini11_EndlessLoop(elapsed) { // NEW endless loop render
  background(255, 200, 200); // unsettling pink-red

  // Progress based on successful clicks
  const progress = loopClicks / LOOP_TARGET_CLICKS;
  const currentSize = loopBtnSize * (1 - progress * 0.8); // Shrink the button

  // Subtle color shift/pulse
  const r = 255 * (1 - progress) + 80 * progress;
  const g = 80;
  const b = 80 * (1 - progress) + 200 * progress;

  // Draw button (circle)
  push();
  const isHover = dist(mouseX, mouseY, loopBtnPos.x, loopBtnPos.y) < currentSize / 2;
  fill(isHover ? color(255, 255, 100) : color(r, g, b));
  stroke(0);
  strokeWeight(4);
  ellipse(loopBtnPos.x, loopBtnPos.y, currentSize, currentSize);

  // Button label
  textSize(min(currentSize * 0.35, 30));
  fill(0);
  text("", loopBtnPos.x, loopBtnPos.y - 8);
  textSize(min(currentSize * 0.25, 20));
  text("", loopBtnPos.x, loopBtnPos.y + 16);
  pop();

  // Instruction/status text
  push();
  textSize(min(width, height) * 0.045);
  fill(0);
  stroke(255);
  strokeWeight(3);
  const statusText = loopClicks >= LOOP_TARGET_CLICKS
    ? "LOOP BROKEN! (briefly)"
    : `Clicks to Break: ${LOOP_TARGET_CLICKS - loopClicks}`;
  text(statusText, width / 2, height * 0.18);
  pop();
} //

/* ================== MINIGAME 12: LEGAL MALWARE TEXT (4s) ================== */
function drawLegalMalware(elapsed) {
  background(248, 250, 255); // pale

  const holdingSpace = keyIsDown(32); // true while key held

  // While holding SPACE: pause spawning & play/loop bg_legal; on release: stop
  const legalBg = snd['bg_12'];

  // Simple timer to limit playback duration
  if (!this.legalPlayStart) this.legalPlayStart = 0;           // store when looping began
  const now = millis();                                        // current time in ms

  if (holdingSpace) {
    if (
      legalBg &&
      legalBg.isLoaded &&
      legalBg.isLoaded() &&
      !legalBg.isPlaying()
    ) {
      legalBg.loop();                                          // start loop
      legalBg.setVolume(0.5);                                  // set volume
      this.legalPlayStart = now;                               // mark start time
    }

    // Stop automatically after 3 seconds of playback
    if (
      legalBg &&
      legalBg.isPlaying &&
      legalBg.isPlaying() &&
      now - this.legalPlayStart > 3000
    ) {
      legalBg.setLoop(false);                                  // disable loop flag
      legalBg.stop();                                          // cut playback
    }
  } else {
    // FIX: Ensure the loop stops immediately on key release
    if (legalBg && legalBg.isPlaying && legalBg.isPlaying()) {
      legalBg.setLoop(false);                                  // ensure looping disabled
      legalBg.stop();                                          // stop when space released
    }
  }

  // Spawn new snippets ONLY when not holding space
  if (!holdingSpace && millis() - legalLastSpawn > legalSpawnInterval) {
    legalLastSpawn = millis();
    legalSnippets.push({
      x: random(width), y: random(height), rot: random(-0.2, 0.2),
      txt: random([
        "LIMITED LIABILITY NOTICE",
        "NON-DISCLOSURE ACKNOWLEDGED",
        "FOR INTERNAL USE ONLY",
        "USER CONSENT PENDING",
        "INTELLECTUAL PROPERTY CLAIM",
        "VOID WHERE PROHIBITED",
        "SUBJECT TO AUDIT",
        "LICENSE AGREEMENT EXPIRED",
        "TERMINATION CLAUSE ACTIVE",
        "FORCE MAJEURE INVOKED",
        "CONTRACTUAL OBLIGATION LOOP",
        "THIRD-PARTY DATA SHARING",
        "INDEMNIFICATION REQUIRED",
        "CONFIDENTIALITY BREACH REPORTED",
        "DISPUTE RESOLUTION IN PROGRESS",
        "PATENT PENDING PERPETUITY",
        "WAIVER OF RIGHTS ACCEPTED",
        "JURISDICTION: UNKNOWN",
        "RETENTION POLICY ENABLED",
        "FINAL SETTLEMENT OFFER",
        "NOTICE OF COMPLIANCE FAILURE",
        "MANDATORY UPDATE ENFORCED",
        "CONSENT FORM OUTDATED",
        "SECTION 404 UNAVAILABLE",
        "NON-COMPETE ACTIVATED",
        "EXCLUSIVITY AGREEMENT VIOLATED",
        "TERMS SUBJECT TO CHANGE",
        "PERPETUAL LICENSE GRANTED",
        "CLAUSE 9.3(B) DISPUTED",
        "CONSUMER RIGHTS OVERRIDDEN"
      ]),
      size: random(14, 28),
      life: random(1500, 4000)
    }); //
    if (legalSnippets.length > 240) legalSnippets.shift(); // cap memory
  }

  // Update & draw snippets (malware swarm)
  for (let i = legalSnippets.length - 1; i >= 0; i--) {
    const s = legalSnippets[i]; s.life -= deltaTime;
    push(); translate(s.x, s.y); rotate(s.rot);
    textSize(s.size);
    fill(holdingSpace ? color(60, 160, 255) : color(10, 10, 10)); // frozen text turns bluish
    noStroke(); text(s.txt, 0, 0); pop();
    if (s.life <= 0) legalSnippets.splice(i, 1);
  }

  // Header/instructions
  push(); textSize(min(width, height) * 0.045); stroke(255); strokeWeight(2); fill(20);
  text("THE TERMS ARE MULTIPLYING — HOLD SPACE TO FREEZE THEM", width / 2, height * 0.12); pop();
}

/* ================== MINIGAME 13: SAUSAGE (4s) =================== */
function drawSausage(elapsed) {
  background(255, 237, 210); // deli-beige
         

  // Sausage body
  const sx = width * 0.2, sy = height * 0.5, sw = width * 0.6, sh = min(height * 0.22, 180);
  push();
  noStroke(); fill(200, 80, 70); rect(sx, sy - sh/2, sw, sh, sh/2); // main body
  fill(170, 60, 55); rect(sx + 8, sy - sh/2 + 8, sw - 16, sh - 16, sh/2 - 12); // inner shade
  pop();

  // Fill progress bar
  const pct = constrain(sausageFillCount / SAUSAGE_FILL_TARGET, 0, 1);
  push(); noStroke(); fill(30, 200, 110); rect(sx, sy + sh/2 + 20, sw * pct, 14, 7); stroke(0); noFill(); rect(sx, sy + sh/2 + 20, sw, 14, 7); pop();

  // Active flying labels moving into sausage
  for (let i = sausageFills.length - 1; i >= 0; i--) {
    const f = sausageFills[i];
    // Move towards a random point inside sausage
    const tx = sx + random(20, sw - 20), ty = sy + random(-sh/2 + 14, sh/2 - 14);
    f.x = lerp(f.x, tx, 0.08); f.y = lerp(f.y, ty, 0.08); f.a += 0.03; // wiggle
    push(); translate(f.x, f.y); rotate(0.2 * sin(f.a));
    textSize(20); fill(255); stroke(0); strokeWeight(2); text(f.txt, 0, 0); pop();
    // When close enough, remove from flying set
    if (dist(f.x, f.y, tx, ty) < 18) sausageFills.splice(i, 1);
  }

  // Instructions
  push(); textSize(min(width, height) * 0.045); stroke(255); strokeWeight(2); fill(0);
  text("Click to Add ‘content’ into the sausage.", width / 2, sy - sh/2 - 40); pop();

  // Win text
  if (sausageFillCount >= SAUSAGE_FILL_TARGET) {
    push(); textSize(min(width, height) * 0.07); fill(255); stroke(0); strokeWeight(2);
    text("A FINE MEAL!", width / 2, sy - sh/2 - 100); pop();
  }
}

/* ================== MINIGAME 14: CHECKLIST OF ESSENTIALS =================== */
function drawChecklist(elapsed) { // NEW checklist render
  background(250, 252, 255); // pale “app” background

  // Title
  push();
  textSize(min(width, height) * 0.055);
  fill(20);
  stroke(255);
  strokeWeight(2);
  text("ESSENTIAL CHECKLIST", width / 2, height * 0.18);
  pop();

  // Draw each item as a card with a checkbox
  for (let i = 0; i < checklistItems.length; i++) {
    const item = checklistItems[i];
    const r = 14; // corner radius

    // Card background
    push();
    noStroke();
    const baseCol = item.done ? color(60, 190, 130) : color(235, 240, 250); // filled vs idle
    fill(baseCol);
    rect(item.x, item.y, item.w, item.h, r);
    pop();

    // Checkbox on the left
    const boxSize = min(item.h * 0.45, 26); // size of square box
    const boxX = item.x + boxSize * 1.1;
    const boxY = item.y + item.h / 2 - boxSize / 2;

    push();
    stroke(40, 60, 80);
    strokeWeight(2);
    fill(item.done ? color(255, 255, 255) : color(250));
    rect(boxX, boxY, boxSize, boxSize, 4);

    if (item.done) {
      // check mark
      stroke(40, 140, 80);
      strokeWeight(3);
      noFill();
      const x1 = boxX + boxSize * 0.2;
      const y1 = boxY + boxSize * 0.55;
      const x2 = boxX + boxSize * 0.42;
      const y2 = boxY + boxSize * 0.78;
      const x3 = boxX + boxSize * 0.8;
      const y3 = boxY + boxSize * 0.22;
      line(x1, y1, x2, y2);
      line(x2, y2, x3, y3);
    }
    pop();

    // Label text
    push();
    textAlign(LEFT, CENTER);
    textSize(min(width, height) * 0.022);
    fill(item.done ? 255 : 20);
    noStroke();
    const textX = boxX + boxSize * 1.4;
    const textY = item.y + item.h / 2;
    text(item.label, textX, textY);
    pop();
  }

  // If every item is checked, show a punchline banner
  const allDone = checklistItems.length > 0 && checklistItems.every(it => it.done);
  if (allDone) {
    push();
    textSize(min(width, height) * 0.05);
    stroke(0);
    strokeWeight(3);
    fill(255, 220, 80);
    text("ALL BOXES TICKED. NOTHING CHANGED.", width / 2, height * 0.8);
    pop();
  } else {
    // Gentle hint at bottom
    push();
    textSize(min(width, height) * 0.03);
    fill(80);
    noStroke();
    text("Click items to perform essential tasks.", width / 2, height * 0.82);
    pop();
  }
}

/* ================== MINIGAME 15: CONSTELLATION OF DOUBT =================== */
function drawConstellation(elapsed) { // NEW constellation render
  background(5, 8, 24); // deep night

  // Subtle gradient overlay
  push();
  noStroke();
  for (let i = 0; i < height; i += 4) {
    const t = i / height;
    fill(10 + 30 * t, 10 + 20 * t, 40 + 60 * t, 150);
    rect(0, i, width, 4);
  }
  pop();

  // Draw faint grid to emphasize “charting”
  push();
  stroke(40, 40, 80, 60);
  strokeWeight(1);
  const step = min(width, height) * 0.08;
  for (let x = 0; x <= width; x += step) line(x, 0, x, height);
  for (let y = 0; y <= height; y += step) line(0, y, width, y);
  pop();

  // Draw links between clicked stars
  push();
  stroke(180, 220, 255);
  strokeWeight(2.5);
  for (let link of constellationLinks) {
    const a = constellationStars[link.i1];
    const b = constellationStars[link.i2];
    if (!a || !b) continue;
    line(a.x, a.y, b.x, b.y);
  }
  pop();

  // Draw stars themselves
  for (let i = 0; i < constellationStars.length; i++) {
    const s = constellationStars[i];
    const isLast = (i === constellationLastIndex);
    const baseR = s.r;
    const pulse = 1 + 0.35 * sin(frameCount * 0.08 + i); // soft breathing

    push();
    translate(s.x, s.y);
    noStroke();

    // Outer glow
    fill(120, 180, 255, isLast ? 220 : 140);
    ellipse(0, 0, baseR * 6 * pulse, baseR * 6 * pulse);

    // Core
    fill(255, 255, 255);
    ellipse(0, 0, baseR * 2.0 * pulse, baseR * 2.0 * pulse);
    pop();
  }

  // Title & subtitling
  push();
  textSize(min(width, height) * 0.05);
  fill(240);
  stroke(0);
  strokeWeight(3);
  text("CONSTELLATION OF DOUBT", width / 2, height * 0.14);
  pop();

  push();
  textSize(min(width, height) * 0.027);
  fill(220);
  noStroke();
  text("Click stars to draw a line of meaning. It will not help.", width / 2, height * 0.22);
  pop();

  // Completion gag: when links cover nearly all stars
  const neededLinks = max(0, constellationStars.length - 1);
  const full = constellationLinks.length >= neededLinks && neededLinks > 0;
  if (full) {
    push();
    textSize(min(width, height) * 0.036);
    fill(255, 230, 140);
    stroke(0);
    strokeWeight(2);
    text("YOU HAVE CONNECTED EVERYTHING. IT IS STILL UNCLEAR.", width / 2, height * 0.85);
    pop();
  }
}

/* ================== MINIGAME 16: ESSENTIAL LOADING BAR =================== */
function drawEssentialLoading(elapsed) { // NEW loading bar render
  background(18, 18, 26); // dashboard dark

  // Title
  push();
  textSize(min(width, height) * 0.055);
  fill(240);
  stroke(0);
  strokeWeight(3);
  text("ESSENTIAL LOADING…", width / 2, height * 0.22);
  pop();

  // Progress auto-creeps very slowly over time
  const slowDrift = 0.0002 * deltaTime;
  essentialProgress = constrain(essentialProgress + slowDrift, 0, 1);

  // Loading bar geometry
  const barW = min(width * 0.7, 620);
  const barH = min(height * 0.06, 38);
  const barX = width / 2 - barW / 2;
  const barY = height * 0.5 - barH / 2;
  const radius = 12;

  // Bar background
  push();
  noStroke();
  fill(40, 40, 70);
  rect(barX, barY, barW, barH, radius);
  pop();

  // Filled region
  const fillW = barW * essentialProgress;
  const pulse = 0.15 * sin(frameCount * 0.08);
  const baseCol = lerpColor(color(80, 170, 240), color(80, 240, 170), essentialProgress); // color shift
  push();
  noStroke();
  fill(
    red(baseCol) + 15 * pulse,
    green(baseCol) + 15 * pulse,
    blue(baseCol) + 15 * pulse
  );
  rect(barX, barY, fillW, barH, radius, 0, 0, radius);
  pop();

  // Percentage label
  const pctValue = floor(essentialProgress * 100);
  push();
  textSize(min(width, height) * 0.035);
  fill(255);
  noStroke();
  text(`${pctValue}% ESSENTIAL`, width / 2, barY + barH * 1.6);
  pop();

  // Nudging hint
  if (essentialProgress < 1) {
    push();
    textSize(min(width, height) * 0.028);
    fill(210);
    noStroke();
    text("Click anywhere to make the loading feel more essential.", width / 2, height * 0.72);
    pop();
  } else {
    // Completed punchline
    push();
    textSize(min(width, height) * 0.04);
    fill(255, 230, 90);
    stroke(0);
    strokeWeight(3);
    text("LOADING COMPLETE. ESSENTIALNESS UNCHANGED.", width / 2, height * 0.76);
    pop();
  }

  // Little counter showing how many times user helped
  push();
  textSize(min(width, height) * 0.022);
  fill(180);
  noStroke();
  text(`User interventions: ${essentialNudges}`, width / 2, height * 0.86);
  pop();
}

/* =============================== INTERACTION ===============================  */
let __audioArmed = false; function armAudioOnce_() { __audioArmed = true; } // arm audio (if needed by browser)

function mousePressed() {
  armAudioOnce_(); //

  if (gameMode === "start") { // start screen click handling
    if (mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.w &&
        mouseY >= startBtn.y && mouseY <= startBtn.y + startBtn.h) {
      startNewGame(nextMiniIdForStart()); // enter gameplay
    }
    return; // do not fall through
  } //

  if (gameMode === "end") { // end screen click handling <-- ADDED
    if (mouseX >= endBtn.x && mouseX <= endBtn.x + endBtn.w &&
        mouseY >= endBtn.y && mouseY <= endBtn.y + endBtn.h) {
      setup(); // restart the game by calling setup()
    }
    return; // do not fall through
  }

  if (gameMode === "menu") {
    for (let i = 0; i < menuRects.length; i++) {
      const r = menuRects[i];
      if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) {
        const chosen = AVAILABLE_MINIS[i]; startNewGame(chosen); return; //
      }
    }
    return;
  }

  if (gameMode !== "game") return;

  if (currentMini === 2) {
    if (noiseClicks < 5) {
      noiseClicks++;
      clickPuffs.push({ x: mouseX, y: mouseY, kind: floor(random(0, 3)), when: millis() });
      const pool = (snd.squirrel_clicks || []).filter(h => h && h.isLoaded && h.isLoaded());
      if (pool.length > 0) { const choice = random(pool); if (choice && choice.play) choice.play(); } //
    }
  }

  if (currentMini === 3) {
    const bw = min(width, 600) * 0.35, bh = 56, bx = width/2 - bw/2, by = height*0.82 - bh/2;
    if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
      faceReset = true; faceExpression = floor(random(0, FACE_EXPRESSIONS + 1));
      if (snd.reset_click && snd.reset_click.isLoaded && snd.reset_click.isLoaded()) snd.reset_click.play(); //
    }
  }

  if (currentMini === 4) { // click tiny target to catch it
    const d = dist(mouseX, mouseY, mini4_motPos.x, mini4_motPos.y); //
    if (d <= 10) mini4_targetCaught = true; //
  }

  if (currentMini === 6) {
    const cx = width * 0.5, cy = height * 0.52, dx = mouseX - cx, dy = mouseY - cy;
    const inside = (dx * dx + dy * dy) <= (egoBaseRadius * egoBaseRadius);
    if (!egoPopped && inside) {
      egoHits++; egoBaseRadius *= 0.85; egoLastHitMs = millis();
      if (snd.ego_hit && snd.ego_hit.isLoaded && snd.ego_hit.isLoaded()) snd.ego_hit.play(); //
      if (egoHits >= EGO_HITS_TO_POP || egoBaseRadius < min(width, height) * 0.06) egoPopped = true;
    }
  }

  if (currentMini === 7) dogEverPressed = true; //

  if (currentMini === 10) { footDown = true; if (snd.monty_stomp && snd.monty_stomp.isLoaded && snd.monty_stomp.isLoaded()) snd.monty_stomp.play(); } //

  if (currentMini === 11) { // NEW endless loop click logic
    const currentSize = loopBtnSize * (1 - (loopClicks / LOOP_TARGET_CLICKS) * 0.8);
    const d = dist(mouseX, mouseY, loopBtnPos.x, loopBtnPos.y);
    if (d <= currentSize / 2 && loopClicks < LOOP_TARGET_CLICKS) {
      loopClicks++;
      // Recalculate new random position (avoid edges)
      const padding = currentSize / 2 + 10;
      loopBtnPos.x = random(padding, width - padding);
      loopBtnPos.y = random(padding, height - padding);
      // Optional: play a success sound
    }
  }

  if (currentMini === 13) {
    // Add a flying label and increment fill (with click sfx)
    const label = random(sausageItems);
    sausageFills.push({ x: mouseX, y: mouseY, txt: label, a: random(TWO_PI) });
    if (sausageFillCount < SAUSAGE_FILL_TARGET) sausageFillCount++;
    if (snd.sausage_click && snd.sausage_click.isLoaded && snd.sausage_click.isLoaded()) snd.sausage_click.play(); //
  }

  if (currentMini === 14) {
    // Toggle checklist items when clicked
    for (let item of checklistItems) {
      if (
        mouseX >= item.x &&
        mouseX <= item.x + item.w &&
        mouseY >= item.y &&
        mouseY <= item.y + item.h
      ) {
        item.done = !item.done; // flip state
        if (snd.nudge_bump && snd.nudge_bump.isLoaded && snd.nudge_bump.isLoaded()) snd.nudge_bump.play(); // soft UX “confirm”
        break;
      }
    }
  }

  if (currentMini === 15) {
    // Click near a star to add/extend a link chain
    let clickedIndex = null;
    for (let i = 0; i < constellationStars.length; i++) {
      const s = constellationStars[i];
      const d = dist(mouseX, mouseY, s.x, s.y);
      if (d <= s.r * 4.0) { clickedIndex = i; break; } // generous hit radius
    }

    if (clickedIndex !== null) {
      if (constellationLastIndex !== null && constellationLastIndex !== clickedIndex) {
        // Create a link from the previous star to this one (avoid duplicates)
        const existing = constellationLinks.some(
          ln => (ln.i1 === constellationLastIndex && ln.i2 === clickedIndex) ||
                (ln.i1 === clickedIndex && ln.i2 === constellationLastIndex)
        ); //
        if (!existing) constellationLinks.push({ i1: constellationLastIndex, i2: clickedIndex }); // add link
      }
      constellationLastIndex = clickedIndex; // update current focus
    }
  }

  if (currentMini === 16) {
    // Clicking gives a noticeable bump in “essential” progress
    const bump = 0.12;
    essentialProgress = constrain(essentialProgress + bump, 0, 1);
    essentialNudges++;
  }
}

function mouseReleased() {
  if (gameMode === "menu" || gameMode === "end") return; // <-- ADDED "end"
  if (gameMode !== "game") return;

  if (currentMini === 7) {
    if (dogEverPressed) {
      dogFailed = true;
      if (snd.dog_bite && snd.dog_bite.isLoaded && snd.dog_bite.isLoaded()) snd.dog_bite.play(); //
    }
  }
  if (currentMini === 10) footDown = false; // raise foot
}

function keyPressed() {
  armAudioOnce_(); //

  if (gameMode === "start") { // Enter to start
    if (keyCode === ENTER || keyCode === RETURN) {
      startNewGame(nextMiniIdForStart()); // begin gameplay
      return false; // prevent default
    }
    return; // ignore other keys in start screen
  } //

  if (gameMode === "end") { // Enter to restart from end screen <-- ADDED
    if (keyCode === ENTER || keyCode === RETURN) {
      setup(); // restart the game
      return false; // prevent default
    }
    return;
  }

  // TAB toggles menu
  if (keyCode === TAB) {
    if (gameMode !== "menu") enterMenu(); else startNewGame(currentMini);
    return false; // prevent browser focus jump
  }

  if (gameMode === "menu") {
    if (keyCode === UP_ARROW)   { menuSelIndex = (menuSelIndex - 1 + AVAILABLE_MINIS.length) % AVAILABLE_MINIS.length; return false; } //
    if (keyCode === DOWN_ARROW) { menuSelIndex = (menuSelIndex + 1) % AVAILABLE_MINIS.length; return false; } //
    if (keyCode === ENTER || keyCode === RETURN) { const chosen = AVAILABLE_MINIS[menuSelIndex]; startNewGame(chosen); return false; } //
    return;
  }

  if (gameMode !== "game") return;

  if (currentMini === 5 && (key === ' ' || keyCode === 32)) {
    if (!sortedOnce) {
      sortedOnce = true; bongFlashStartMs = millis();
      griefPos.x = width * 0.2;  griefPos.y = height * 0.5;
      mayoPos.x = width * 0.8;   mayoPos.y = height * 0.5;
      if (snd.bong_gavel && snd.bong_gavel.isLoaded && snd.bong_gavel.isLoaded()) snd.bong_gavel.play(); //
    }
  }

  if (currentMini === 8) {
    if (key.toLowerCase() === 'g') {
      spaghettiState = "column";
      if (snd.spaghetti_ok && snd.spaghetti_ok.isLoaded && snd.spaghetti_ok.isLoaded()) snd.spaghetti_ok.play(); //
    } else {
      spaghettiState = "angry";
      if (snd.spaghetti_wrong && snd.spaghetti_wrong.isLoaded && snd.spaghetti_wrong.isLoaded()) snd.spaghetti_wrong.play(); //
    }
  }

  // Note: Legal Malware (12) uses keyIsDown(32) in draw() for hold behavior; no toggle here
}

/* =============================== MENU RENDER =============================== */
function enterMenu() {
  if (snd.cloud_trimmer_loop && snd.cloud_trimmer_loop.isPlaying()) snd.cloud_trimmer_loop.stop(); //
  if (snd.dog_hold && snd.dog_hold.isPlaying && snd.dog_hold.isPlaying()) snd.dog_hold.stop();     //
  stopMiniBg(); gameMode = "menu"; menuSelIndex = max(0, AVAILABLE_MINIS.indexOf(currentMini)); //
} //

function drawMenu() {
  background(18, 22, 38);
  push(); textAlign(CENTER, CENTER); textSize(min(width, height) * 0.048); fill(255); stroke(0); strokeWeight(2);
  text("Select A Micro-Game", width / 2, height * 0.08); pop();

  push(); textSize(min(width, height) * 0.025); fill(230); noStroke();
  text("Click an option, or use ↑/↓ and Enter.  Press TAB to return.", width / 2, height * 0.16); pop();

  const listTop = height * 0.23, rowH = min(60, height * 0.08), padX = 40, itemW = min(width * 0.5, 720), x = (width - itemW) / 3;
  menuRects = []; menuHoverIndex = -1;

  const my = mouseY;

  // Two-column layout settings (keeps your existing 'x' as the left anchor).
  const COLS = 2;                           // number of columns to display
  const colGap = 24;                        // horizontal gap between columns
  const margin = 200;                        // right-side margin so UI doesn't touch canvas edge

  // Compute the widest safe item width so both columns fit from 'x' to the right edge.
  const availableRight = (width - margin) - x;                                     // space from left anchor to right edge
  const itemWFit = Math.max(80, Math.min(itemW, (availableRight - (COLS - 1) * colGap) / COLS)); // fitted width per column

  for (let i = 0; i < AVAILABLE_MINIS.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);         // map linear index into (col,row)
    const xCellFit = x + col * (itemWFit + colGap);            // x-pos for this column using fitted width

    const y = listTop + row * (rowH + 12),                      // original row spacing preserved
          rectObj = { x: xCellFit, y: y - rowH / 2, w: itemWFit, h: rowH }; // use fitted x/width

    menuRects.push(rectObj);
    let isHover =
      mouseX >= rectObj.x &&
      mouseX <= rectObj.x + rectObj.w &&
      my >= rectObj.y &&
      my <= rectObj.y + rectObj.h;
    if (isHover) menuHoverIndex = i;

    const selected = (i === menuSelIndex), hovered = (i === menuHoverIndex);
    push(); noStroke();
    const base = color(40, 48, 80), sel = color(70, 90, 160), hov = color(55, 66, 110);
    fill(selected ? sel : hovered ? hov : base);
    rect(rectObj.x, rectObj.y, rectObj.w, rectObj.h, 12);
    pop();

    push();
    textAlign(LEFT, CENTER);
    const label = `ID ${AVAILABLE_MINIS[i]} — ${getMiniName(AVAILABLE_MINIS[i])}`;
    textSize(min(width, height) * 0.024);
    fill(255); noStroke();
    text(label, rectObj.x + padX, y);
    pop();
  }
}

/* =============================== DECORATIVE ===============================  */
function drawFooterRibbon() {
  push(); noStroke(); fill(0, 0, 0, 30); rect(0, height - 36, width, 36);
  textSize(16); fill(255); text("ABSURDIST MICRO-GAMES • No score. No failure. Only nonsense.", width / 2, height - 18);
  pop();
}

/* ========================= EXTRA EXPRESSIONS HELPER =========================  */
function drawExtraExpression(type, cx, cy, faceR) {
  if (!faceReset || type <= 0) return;
  push(); stroke(0); strokeWeight(2); noFill();
  if (type === 1) { fill(0);
    rect(cx - faceR * 0.38, cy - faceR * 0.2, faceR * 0.28, faceR * 0.16, 4);
    rect(cx + faceR * 0.10, cy - faceR * 0.2, faceR * 0.28, faceR * 0.16, 4);
    noFill(); line(cx - faceR * 0.10, cy - faceR * 0.12, cx + faceR * 0.10, cy - faceR * 0.12);
    arc(cx + faceR * 0.08, cy + faceR * 0.22, faceR * 0.55, faceR * 0.25, 0.1 * PI, 0.8 * PI);
  } else if (type === 2) { noFill();
    for (let i = 0; i < 8; i++) {
      arc(cx - faceR * 0.25, cy - faceR * 0.15, faceR * (0.05 + i*0.02), faceR * (0.05 + i*0.02), 0, TWO_PI - 0.2*i);
      arc(cx + faceR * 0.25, cy - faceR * 0.15, faceR * (0.05 + i*0.02), faceR * (0.05 + i*0.02), 0, TWO_PI - 0.2*i);
    }
  } else if (type === 3) { fill(0);
    arc(cx - faceR * 0.12, cy + faceR * 0.18, faceR * 0.35, faceR * 0.18, PI, TWO_PI);
    arc(cx + faceR * 0.12, cy + faceR * 0.18, faceR * 0.35, faceR * 0.18, PI, TWO_PI);
  } else if (type === 4) { fill(255, 220, 0);
    star(cx - faceR * 0.25, cy - faceR * 0.15, faceR * 0.05, faceR * 0.11, 5);
    star(cx + faceR * 0.25, cy - faceR * 0.15, faceR * 0.05, faceR * 0.11, 5);
  } else if (type === 5) { noFill();
    arc(cx, cy + faceR * 0.18, faceR * 0.55, faceR * 0.25, 0, PI);
    noStroke(); fill(255, 80, 120);
    rect(cx - faceR * 0.08, cy + faceR * 0.22, faceR * 0.16, faceR * 0.16, 8);
    stroke(180, 0, 50); line(cx, cy + faceR * 0.22, cx, cy + faceR * 0.34);
  } else if (type === 6) {
    line(cx - faceR * 0.36, cy - faceR * 0.28, cx - faceR * 0.14, cy - faceR * 0.20);
    line(cx + faceR * 0.14, cy - faceR * 0.20, cx + faceR * 0.36, cy - faceR * 0.28);
  }
  pop();

  function star(x, y, r1, r2, n) {
    push(); beginShape(); for (let i = 0; i < n * 2; i++) { const ang = PI * i / n, rr = (i % 2 === 0) ? r2 : r1;
      vertex(x + cos(ang) * rr, y + sin(ang) * rr); } endShape(CLOSE); pop();
  }
}

/* =============================== END SKETCH ===============================  */
// Press TAB for the menu. Change GITHUB_URL to point to your repository.
// Additions for Start Screen, new mini 4, 14, 15, 16, & Monty leg/nails mechanics
// Mini 11 (Repo It) replaced with Mini 11 (The Endless Loop).
// END SCREEN ADDED after the last sequential minigame (16).