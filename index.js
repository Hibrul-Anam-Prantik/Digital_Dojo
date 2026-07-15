/**
 * CYBER RIDER // Game Engine
 * Features: 60 FPS Canvas rendering, CPU AI steering, Parallax Synthwave backdrop,
 * procedurally synthesized synth engine sounds, Nitro speeds, Tron trails, and collision FX.
 */

// --- PROCEDURAL ENGINE AUDIO CLASS (Web Audio API) ---
class RiderAudio {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('cyber_grid_sound') !== 'false';
    
    // Continuous engine nodes
    this.playerOsc = null;
    this.playerGain = null;
    this.cpuOsc = null;
    this.cpuGain = null;
    
    this.initOnFirstTouch();
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  initOnFirstTouch() {
    const handleTouch = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('click', handleTouch);
      window.removeEventListener('keydown', handleTouch);
    };
    window.addEventListener('click', handleTouch);
    window.addEventListener('keydown', handleTouch);
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('cyber_grid_sound', this.enabled);
    if (!this.enabled) {
      this.stopEngines();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.enabled;
  }

  startEngines() {
    if (!this.enabled || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopEngines(); // Clean up if running

    try {
      // 1. Player Engine
      this.playerOsc = this.ctx.createOscillator();
      this.playerGain = this.ctx.createGain();
      const playerFilter = this.ctx.createBiquadFilter();

      this.playerOsc.type = 'sawtooth';
      this.playerOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // low hum
      
      playerFilter.type = 'lowpass';
      playerFilter.frequency.setValueAtTime(180, this.ctx.currentTime);

      this.playerGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.playerOsc.connect(playerFilter);
      playerFilter.connect(this.playerGain);
      this.playerGain.connect(this.ctx.destination);
      this.playerOsc.start();

      // 2. CPU Engine (slightly different pitch to avoid phase cancellation)
      this.cpuOsc = this.ctx.createOscillator();
      this.cpuGain = this.ctx.createGain();
      const cpuFilter = this.ctx.createBiquadFilter();

      this.cpuOsc.type = 'triangle';
      this.cpuOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

      cpuFilter.type = 'lowpass';
      cpuFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

      this.cpuGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

      this.cpuOsc.connect(cpuFilter);
      cpuFilter.connect(this.cpuGain);
      this.cpuGain.connect(this.ctx.destination);
      this.cpuOsc.start();
    } catch (e) {
      console.warn("Failed starting synth engines", e);
    }
  }

  updateEngines(playerSpeed, cpuSpeed, playerMax, cpuMax) {
    if (!this.enabled || !this.ctx || !this.playerOsc) return;

    try {
      // Scale frequency and volume based on speed ratios
      const pRatio = Math.min(playerSpeed / playerMax, 1.5);
      const cRatio = Math.min(cpuSpeed / cpuMax, 1.5);

      // Player engine frequency sweep (45Hz to 160Hz)
      const pFreq = 45 + pRatio * 100;
      this.playerOsc.frequency.setTargetAtTime(pFreq, this.ctx.currentTime, 0.05);
      this.playerGain.gain.setTargetAtTime(0.03 + pRatio * 0.06, this.ctx.currentTime, 0.05);

      // CPU engine frequency sweep (50Hz to 180Hz)
      const cFreq = 50 + cRatio * 90;
      this.cpuOsc.frequency.setTargetAtTime(cFreq, this.ctx.currentTime, 0.05);
      this.cpuGain.gain.setTargetAtTime(0.015 + cRatio * 0.04, this.ctx.currentTime, 0.05);
    } catch (e) {
      // Ignore audio update errors during game teardown
    }
  }

  stopEngines() {
    try {
      if (this.playerOsc) {
        this.playerOsc.stop();
        this.playerOsc.disconnect();
        this.playerOsc = null;
      }
      if (this.cpuOsc) {
        this.cpuOsc.stop();
        this.cpuOsc.disconnect();
        this.cpuOsc = null;
      }
    } catch (e) {
      // Audio node already stopped
    }
  }

  playOscillator(freqStart, freqEnd, type, duration, gainStart) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
      }

      gainNode.gain.setValueAtTime(gainStart, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio failure", e);
    }
  }

  playSwish() {
    // Quick noise-like lane switch swish
    this.playOscillator(600, 200, 'triangle', 0.08, 0.1);
  }

  playCrash() {
    // Low, heavy explosion-like sound
    this.playOscillator(180, 20, 'sawtooth', 0.45, 0.25);
  }

  playBoost() {
    // Cyber sweep upwards
    this.playOscillator(300, 1200, 'sine', 0.35, 0.18);
  }

  playWin() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const melody = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Triumphant arpeggio
    melody.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  }

  playLose() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const melody = [392.00, 349.23, 311.13, 261.63]; // Sad descending arpeggio
    melody.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.15, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.6);
    });
  }
}

// --- MAIN ENGINE CONTROLLER ---
class CyberRiderGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.audio = new RiderAudio();
    this.gameState = 'start'; // 'start', 'playing', 'win', 'lose'
    
    // Race configurations
    this.trackLength = 2000; // 2000 meters race
    this.pixelsPerMeter = 12; // Visual scaling distance
    
    // Lane dimensions
    this.laneHeight = 60;
    this.roadCenterY = 0; // Calculated on resize
    
    // Canvas sizing configs
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Timing metrics
    this.lastTime = 0;
    this.raceStartTime = 0;
    this.maxRecordedPlayerSpeed = 0;

    // Riders
    this.player = {
      x: 180, // locked x position in camera viewport
      y: 0,
      lane: 1, // 0: Top, 1: Mid, 2: Bot
      speed: 0,
      targetSpeed: 40, // Base speed (meters/sec) ~ 144km/h
      baseMaxSpeed: 40,
      maxSpeed: 40,
      distance: 0,
      nitro: 30, // Start with some boost
      isNitroActive: false,
      color: '#00f0ff',
      glowColor: 'rgba(0, 240, 255, 0.4)',
      trail: [],
      recoveryTimer: 0,
      width: 65,
      height: 25
    };

    this.cpu = {
      x: 180, // drawn offset based on player relative distance
      y: 0,
      lane: 1,
      speed: 0,
      targetSpeed: 38, // Cruising speed
      baseMaxSpeed: 38,
      maxSpeed: 38,
      distance: 0,
      color: '#ff4d00',
      glowColor: 'rgba(255, 77, 0, 0.4)',
      trail: [],
      recoveryTimer: 0,
      width: 65,
      height: 25,
      
      // AI metrics
      visionRange: 450,
      reactionTimer: 0,
      reactionInterval: 0.15 // checks environment every 150ms
    };

    // Obstacles and collectibles
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 1.6; // spawn item every 1.6s

    // Particle FX
    this.sparks = [];

    // Keyboard states
    this.keys = {};

    // Cache DOM Elements
    this.startScreen = document.getElementById('start-screen');
    this.winScreen = document.getElementById('win-screen');
    this.loseScreen = document.getElementById('lose-screen');
    
    this.playerSpeedEl = document.getElementById('player-speed');
    this.cpuSpeedEl = document.getElementById('cpu-speed');
    this.playerNitroEl = document.getElementById('player-nitro');
    this.nitroTextEl = document.getElementById('nitro-text');
    this.distRemEl = document.getElementById('distance-remaining');
    this.progPlayer = document.getElementById('progress-player');
    this.progCpu = document.getElementById('progress-cpu');
    
    this.winTimeEl = document.getElementById('win-time');
    this.winMaxEl = document.getElementById('win-max-speed');
    this.loseDistEl = document.getElementById('lose-dist');
    
    this.soundToggle = document.getElementById('sound-toggle');
    this.soundOnIcon = document.getElementById('sound-on-icon');
    this.soundOffIcon = document.getElementById('sound-off-icon');

    // Synthwave grid scrolling offset
    this.gridOffset = 0;
    this.stars = [];
    this.generateStars();

    this.bindEvents();
    this.updateSoundIcons();
  }

  resizeCanvas() {
    // Fit canvas in wrapper 16:9 aspect ratio
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.width * (9 / 16);
    this.roadCenterY = this.canvas.height * 0.70;
  }

  generateStars() {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * 1200,
        y: Math.random() * (this.canvas.height * 0.4), // upper part of sky
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.05 + 0.01 // Parallax speed
      });
    }
  }

  bindEvents() {
    // Sound Button Toggle
    this.soundToggle.addEventListener('click', () => {
      this.audio.toggle();
      this.updateSoundIcons();
    });

    // Start Button
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('win-restart-btn').addEventListener('click', () => this.startGame());
    document.getElementById('lose-restart-btn').addEventListener('click', () => this.startGame());

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.gameState === 'playing') {
        // Instant response on press to change lane
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.changePlayerLane(-1);
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          this.changePlayerLane(1);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  updateSoundIcons() {
    if (this.audio.enabled) {
      this.soundOnIcon.classList.remove('hidden');
      this.soundOffIcon.classList.add('hidden');
    } else {
      this.soundOnIcon.classList.add('hidden');
      this.soundOffIcon.classList.remove('hidden');
    }
  }

  startGame() {
    this.audio.init();
    
    // Hide screens
    this.startScreen.classList.add('hidden');
    this.winScreen.classList.add('hidden');
    this.loseScreen.classList.add('hidden');

    // Reset rider states
    this.player.lane = 1;
    this.player.y = this.getLaneY(1);
    this.player.speed = 0;
    this.player.distance = 0;
    this.player.nitro = 30;
    this.player.trail = [];
    this.player.recoveryTimer = 0;
    this.player.isNitroActive = false;

    this.cpu.lane = 1;
    this.cpu.y = this.getLaneY(1);
    this.cpu.speed = 0;
    this.cpu.distance = 0;
    this.cpu.trail = [];
    this.cpu.recoveryTimer = 0;
    
    this.obstacles = [];
    this.sparks = [];
    
    this.maxRecordedPlayerSpeed = 0;
    this.raceStartTime = performance.now();
    this.lastTime = performance.now();

    // Start Audio engines
    this.audio.playBoost();
    this.audio.startEngines();

    this.gameState = 'playing';
    
    // Start game loop
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(timestamp) {
    if (this.gameState !== 'playing') {
      this.audio.stopEngines();
      return;
    }

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // cap dt at 100ms
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  getLaneY(laneIdx) {
    // 0: top lane, 1: middle, 2: bottom
    return this.roadCenterY + (laneIdx - 1) * this.laneHeight;
  }

  changePlayerLane(dir) {
    const nextLane = this.player.lane + dir;
    if (nextLane >= 0 && nextLane <= 2) {
      this.player.lane = nextLane;
      this.audio.playSwish();
    }
  }

  update(dt) {
    // --- PLAYER ACCELERATION PHYSICS ---
    if (this.player.recoveryTimer > 0) {
      this.player.recoveryTimer -= dt;
      this.player.targetSpeed = 16; // slowed speed
    } else {
      // Accelerate / Nitro
      if (this.keys['Space'] && this.player.nitro > 0) {
        this.player.isNitroActive = true;
        this.player.maxSpeed = this.player.baseMaxSpeed * 1.6; // 230 km/h
        this.player.targetSpeed = this.player.maxSpeed;
        this.player.nitro -= dt * 25; // consumes nitro
        if (Math.random() < 0.3) {
          this.audio.playOscillator(600, 1200, 'sine', 0.1, 0.05); // nitro buzz
        }
      } else {
        if (this.player.isNitroActive) {
          this.player.isNitroActive = false;
        }
        this.player.maxSpeed = this.player.baseMaxSpeed;
        this.player.targetSpeed = this.player.baseMaxSpeed;
        
        // Passive nitro regeneration
        if (this.player.nitro < 100) {
          this.player.nitro += dt * 3.5;
        }
      }
    }

    // Smooth speed interpolations
    this.player.speed += (this.player.targetSpeed - this.player.speed) * dt * 2.5;
    this.player.distance += this.player.speed * dt;
    this.maxRecordedPlayerSpeed = Math.max(this.maxRecordedPlayerSpeed, this.player.speed);

    // Smooth vertical lane tracking
    const playerTargetY = this.getLaneY(this.player.lane);
    this.player.y += (playerTargetY - this.player.y) * dt * 15;

    // --- CPU AI AND ACCELERATION PHYSICS ---
    if (this.cpu.recoveryTimer > 0) {
      this.cpu.recoveryTimer -= dt;
      this.cpu.targetSpeed = 15;
    } else {
      // Dynamic Rubber-banding speed (keeps the race close and exciting)
      const distDiff = this.player.distance - this.cpu.distance;
      if (distDiff > 120) {
        // CPU speeds up if player is far ahead
        this.cpu.targetSpeed = this.cpu.baseMaxSpeed * 1.25;
      } else if (distDiff < -120) {
        // CPU slows down slightly if way ahead
        this.cpu.targetSpeed = this.cpu.baseMaxSpeed * 0.88;
      } else {
        this.cpu.targetSpeed = this.cpu.baseMaxSpeed;
      }
    }

    this.cpu.speed += (this.cpu.targetSpeed - this.cpu.speed) * dt * 2;
    this.cpu.distance += this.cpu.speed * dt;

    // Smooth vertical lane tracking
    const cpuTargetY = this.getLaneY(this.cpu.lane);
    this.cpu.y += (cpuTargetY - this.cpu.y) * dt * 15;

    // Execute CPU AI pathfinding
    this.cpu.reactionTimer += dt;
    if (this.cpu.reactionTimer >= this.cpu.reactionInterval) {
      this.cpu.reactionTimer = 0;
      this.executeCpuAI();
    }

    // Update continuous sound engines
    this.audio.updateEngines(this.player.speed, this.cpu.speed, this.player.baseMaxSpeed, this.cpu.baseMaxSpeed);

    // --- MANAGE OBJECTS ---
    // Spawn new elements
    this.obstacleSpawnTimer += dt;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstaclePair();
    }

    // Move and filter obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obj = this.obstacles[i];
      
      // Move relative to Player speed (camera lock)
      obj.x -= this.player.speed * this.pixelsPerMeter * dt;

      // Check collision
      this.checkRiderCollision(obj, 'player');
      this.checkRiderCollision(obj, 'cpu');

      // Filter offscreen items (behind player viewport)
      if (obj.x < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // --- ENGINE LIGHT TRAILS ---
    this.updateTrail(this.player);
    this.updateTrail(this.cpu);

    // --- SPARKS PARTICLES ENGINE ---
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx - this.player.speed * this.pixelsPerMeter * dt;
      sp.y += sp.vy;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // --- ROAD SCROLLING GLITCH ---
    this.gridOffset = (this.gridOffset - this.player.speed * this.pixelsPerMeter * dt) % 120;

    // --- HUD DATA updates ---
    this.updateHUD();

    // --- CHECK RACE END conditions ---
    if (this.player.distance >= this.trackLength) {
      this.winRace();
    } else if (this.cpu.distance >= this.trackLength) {
      this.loseRace();
    }
  }

  updateTrail(rider) {
    const rx = this.getRiderX(rider);
    rider.trail.push({ x: rx - 30, y: rider.y });
    if (rider.trail.length > 25) {
      rider.trail.shift();
    }
  }

  getRiderX(rider) {
    if (rider === this.player) return this.player.x;
    
    // CPU X is calculated relative to player distance:
    const diff = (this.cpu.distance - this.player.distance) * this.pixelsPerMeter;
    const baseDrawX = this.player.x + diff;
    
    // Clamp CPU on screen so player can always see it, but indicate position
    return Math.min(Math.max(baseDrawX, 50), this.canvas.width - 80);
  }

  executeCpuAI() {
    // 1. Detect obstacles ahead in current lane
    let upcomingObstacle = null;
    let closestDist = Infinity;
    
    const cpuX = this.getRiderX(this.cpu);

    this.obstacles.forEach(obj => {
      if (obj.lane === this.cpu.lane && obj.x > cpuX) {
        const dist = obj.x - cpuX;
        if (dist < this.cpu.visionRange && dist < closestDist) {
          closestDist = dist;
          upcomingObstacle = obj;
        }
      }
    });

    if (upcomingObstacle && upcomingObstacle.type === 'barrier') {
      // 2. We have a barrier in our lane! Find best alternative lane.
      const currentLane = this.cpu.lane;
      const choices = [];
      
      if (currentLane === 1) {
        // Can go to 0 or 2
        choices.push(0, 2);
      } else if (currentLane === 0) {
        // Can go to 1
        choices.push(1);
      } else if (currentLane === 2) {
        // Can go to 1
        choices.push(1);
      }

      // Check which choice is cleanest (has no obstacles nearest)
      let bestLane = currentLane;
      let safestDist = -Infinity;

      choices.forEach(l => {
        let nearestObjInLaneDist = Infinity;
        this.obstacles.forEach(obj => {
          if (obj.lane === l && obj.x > cpuX) {
            const dist = obj.x - cpuX;
            if (dist < nearestObjInLaneDist) {
              nearestObjInLaneDist = dist;
            }
          }
        });
        
        if (nearestObjInLaneDist > safestDist) {
          safestDist = nearestObjInLaneDist;
          bestLane = l;
        }
      });

      // Switch lane
      if (bestLane !== currentLane && safestDist > 100) {
        this.cpu.lane = bestLane;
      }
    } else {
      // Check if there's a battery nearby in adjacent lanes, CPU will steer to grab it!
      this.obstacles.forEach(obj => {
        if (obj.type === 'battery' && obj.x > cpuX && obj.x - cpuX < 300) {
          const laneDiff = Math.abs(obj.lane - this.cpu.lane);
          if (laneDiff === 1) {
            this.cpu.lane = obj.lane; // Grab battery!
          }
        }
      });
    }
  }

  spawnObstaclePair() {
    // Generate obstacles offscreen to the right
    const spawnX = this.canvas.width + 100;
    
    // Choose pattern: standard grid runner ensure at least one lane is empty
    const lanePattern = Math.random();
    
    if (lanePattern < 0.4) {
      // Barrier in lane 0, Battery in lane 1
      this.obstacles.push({ x: spawnX, lane: 0, type: 'barrier', width: 35, height: 40 });
      this.obstacles.push({ x: spawnX + 80, lane: 1, type: 'battery', width: 20, height: 20 });
    } else if (lanePattern < 0.7) {
      // Barrier in lane 1, Battery in lane 2
      this.obstacles.push({ x: spawnX, lane: 1, type: 'barrier', width: 35, height: 40 });
      this.obstacles.push({ x: spawnX + 100, lane: 2, type: 'battery', width: 20, height: 20 });
    } else if (lanePattern < 0.9) {
      // Barriers blocking top and bottom lanes, center is free
      this.obstacles.push({ x: spawnX, lane: 0, type: 'barrier', width: 35, height: 40 });
      this.obstacles.push({ x: spawnX, lane: 2, type: 'barrier', width: 35, height: 40 });
    } else {
      // Single Battery in middle lane
      this.obstacles.push({ x: spawnX, lane: 1, type: 'battery', width: 20, height: 20 });
    }
  }

  checkRiderCollision(obj, riderName) {
    const rider = riderName === 'player' ? this.player : this.cpu;
    const rx = this.getRiderX(rider);

    // Collision only possible if in same lane
    if (obj.lane === rider.lane) {
      const halfW = rider.width / 2;
      const xOverlap = Math.abs(obj.x - rx) < (halfW + obj.width / 2);
      
      if (xOverlap) {
        if (obj.type === 'barrier') {
          // HIT BARRIER
          rider.speed = 4; // crash speed drop
          rider.recoveryTimer = 1.8; // crash recovery duration (seconds)
          this.spawnSparks(rx, rider.y, rider.color, 15);
          
          if (riderName === 'player') {
            this.audio.playCrash();
          }
          
          // Remove barrier so rider passes through
          const idx = this.obstacles.indexOf(obj);
          if (idx !== -1) this.obstacles.splice(idx, 1);
        } else if (obj.type === 'battery') {
          // COLLECT BATTERY (NITRO BOOST)
          if (riderName === 'player') {
            this.player.nitro = Math.min(this.player.nitro + 25, 100);
            this.player.speed = Math.min(this.player.speed + 12, this.player.maxSpeed);
            this.audio.playBoost();
          } else {
            this.cpu.speed = Math.min(this.cpu.speed + 10, this.cpu.maxSpeed);
          }
          
          this.spawnSparks(obj.x, rider.y, '#d946ef', 10);
          
          // Remove battery
          const idx = this.obstacles.indexOf(obj);
          if (idx !== -1) this.obstacles.splice(idx, 1);
        }
      }
    }
  }

  spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.4 + 0.2,
        color: color
      });
    }
  }

  updateHUD() {
    // 1. Speeds in KM/H (meters/sec * 3.6)
    const pSpeedKph = Math.round(this.player.speed * 3.6);
    const cSpeedKph = Math.round(this.cpu.speed * 3.6);
    this.playerSpeedEl.innerHTML = `${pSpeedKph} <span class="unit">KM/H</span>`;
    this.cpuSpeedEl.innerHTML = `${cSpeedKph} <span class="unit">KM/H</span>`;

    // 2. Nitro progress
    this.playerNitroEl.style.width = `${this.player.nitro}%`;
    this.nitroTextEl.textContent = `${Math.round(this.player.nitro)}%`;

    // 3. Distance remaining
    const remaining = Math.max(0, Math.round(this.trackLength - this.player.distance));
    this.distRemEl.textContent = `Distance: ${remaining}m`;

    // 4. Progress bar positions
    const pPercent = Math.min(100, (this.player.distance / this.trackLength) * 100);
    const cPercent = Math.min(100, (this.cpu.distance / this.trackLength) * 100);
    this.progPlayer.style.left = `${pPercent}%`;
    this.progCpu.style.left = `${cPercent}%`;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Starry Sky & Parallax Stars
    this.ctx.fillStyle = '#05030f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.stars.forEach(star => {
      // scroll stars opposite to player speed
      star.x -= this.player.speed * star.speed;
      if (star.x < 0) star.x = this.canvas.width;

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 2. Draw Retro Synthwave Mountains / Neon Skyline
    this.drawSkyline();

    // 3. Draw Cyber Highway grid road background
    this.drawHighway();

    // 4. Draw Trails
    this.drawRiderTrail(this.player);
    this.drawRiderTrail(this.cpu);

    // 5. Draw Obstacles & Battery items
    this.obstacles.forEach(obj => {
      if (obj.type === 'barrier') {
        // Draw neon barrier
        this.ctx.save();
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = varOklch('--color-obstacle', '#eab308');
        this.ctx.fillStyle = varOklch('--color-obstacle', '#eab308');
        this.ctx.beginPath();
        this.ctx.roundRect(obj.x - obj.width/2, this.getLaneY(obj.lane) - 20, obj.width, obj.height, 6);
        this.ctx.fill();
        
        // Hazard pattern inside barrier
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        for (let offset = -20; offset < 20; offset += 10) {
          this.ctx.moveTo(obj.x + offset - 5, this.getLaneY(obj.lane) - 20);
          this.ctx.lineTo(obj.x + offset + 5, this.getLaneY(obj.lane) + 20);
        }
        this.ctx.stroke();
        this.ctx.restore();
      } else {
        // Draw battery cell powerup
        this.ctx.save();
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = varOklch('--color-nitro', '#d946ef');
        this.ctx.fillStyle = varOklch('--color-nitro', '#d946ef');
        
        // diamond shape rotation
        this.ctx.translate(obj.x, this.getLaneY(obj.lane));
        this.ctx.rotate(Date.now() * 0.005);
        this.ctx.beginPath();
        this.ctx.rect(-obj.width/2, -obj.height/2, obj.width, obj.height);
        this.ctx.fill();
        
        // inner glowing core
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    });

    // 6. Draw Sparks
    this.sparks.forEach(sp => {
      this.ctx.fillStyle = sp.color;
      this.ctx.fillRect(sp.x, sp.y, 2.5, 2.5);
    });

    // 7. Draw Riders
    this.drawBike(this.player, 'P');
    this.drawBike(this.cpu, 'CPU');

    // 8. Draw CPU Out of Screen Marker
    this.drawCpuMarker();
  }

  drawSkyline() {
    this.ctx.save();
    // Parallax speed for skyline (15% of player speed)
    const skylineScroll = (this.gridOffset * 0.15) % 300;
    
    // Draw neon pink wireframe grid mountains in background
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    this.ctx.lineWidth = 1.5;
    
    for (let xOffset = -300; xOffset < this.canvas.width + 300; xOffset += 150) {
      const scrollX = xOffset + skylineScroll;
      const mountainY = this.roadCenterY - 60;
      
      this.ctx.beginPath();
      this.ctx.moveTo(scrollX, mountainY);
      this.ctx.lineTo(scrollX + 75, mountainY - 80);
      this.ctx.lineTo(scrollX + 150, mountainY);
      this.ctx.stroke();
    }
    
    // Sunset sun gradient radial glow
    const radial = this.ctx.createRadialGradient(
      this.canvas.width/2, this.roadCenterY - 40, 10,
      this.canvas.width/2, this.roadCenterY - 40, 180
    );
    radial.addColorStop(0, 'rgba(217, 70, 239, 0.12)');
    radial.addColorStop(1, 'rgba(0,0,0,0)');
    
    this.ctx.fillStyle = radial;
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width/2, this.roadCenterY - 40, 180, Math.PI, 0);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawHighway() {
    this.ctx.save();
    
    // Road surface color
    this.ctx.fillStyle = '#0a0818';
    this.ctx.fillRect(0, this.roadCenterY - 95, this.canvas.width, 190);

    // Highway boundaries (Top and bottom glowing laser lines)
    this.ctx.shadowBlur = 8;
    this.ctx.lineWidth = 2.5;

    // Top laser edge (purple/magenta)
    this.ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.roadCenterY - 90);
    this.ctx.lineTo(this.canvas.width, this.roadCenterY - 90);
    this.ctx.stroke();

    // Bottom laser edge (purple/magenta)
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.roadCenterY + 90);
    this.ctx.lineTo(this.canvas.width, this.roadCenterY + 90);
    this.ctx.stroke();

    // Lane dividers (scrolling dashed lines)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([40, 30]);
    this.ctx.lineDashOffset = -this.gridOffset;

    // Line 1
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.roadCenterY - 30);
    this.ctx.lineTo(this.canvas.width, this.roadCenterY - 30);
    this.ctx.stroke();

    // Line 2
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.roadCenterY + 30);
    this.ctx.lineTo(this.canvas.width, this.roadCenterY + 30);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawRiderTrail(rider) {
    if (rider.trail.length < 2) return;

    this.ctx.save();
    this.ctx.lineWidth = rider === this.player && this.player.isNitroActive ? 5 : 2.5;
    this.ctx.strokeStyle = rider.color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = rider.color;

    this.ctx.beginPath();
    this.ctx.moveTo(rider.trail[0].x, rider.trail[0].y);
    for (let i = 1; i < rider.trail.length; i++) {
      this.ctx.lineTo(rider.trail[i].x, rider.trail[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawBike(rider, label) {
    const rx = this.getRiderX(rider);
    
    this.ctx.save();
    this.ctx.translate(rx, rider.y);
    
    // Add visual tilt/lean during transitions
    const targetY = this.getLaneY(rider.lane);
    const diffY = targetY - rider.y;
    const lean = Math.min(Math.max(diffY * 0.08, -0.2), 0.2); // max 12 deg lean
    this.ctx.rotate(lean);

    // Apply neon glow
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = rider.color;

    // Draw motorcycle body
    this.ctx.fillStyle = '#1e1b4b'; // dark chassis core
    this.ctx.beginPath();
    this.ctx.roundRect(-30, -8, 55, 16, 4);
    this.ctx.fill();

    // Draw wheels (Front and Back)
    this.ctx.fillStyle = rider.color;
    this.ctx.beginPath();
    this.ctx.arc(20, 4, 7, 0, Math.PI * 2); // front
    this.ctx.arc(-26, 4, 8, 0, Math.PI * 2); // rear
    this.ctx.fill();

    // Glowing Neon windshield/canopy (Tron Lightcycle vibe)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -6);
    this.ctx.lineTo(12, -4);
    this.ctx.lineTo(4, 3);
    this.ctx.lineTo(-6, 3);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = rider.color;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Nitro exhaust flame if active
    if (rider === this.player && this.player.isNitroActive) {
      this.ctx.fillStyle = '#d946ef';
      this.ctx.shadowColor = '#d946ef';
      this.ctx.beginPath();
      this.ctx.moveTo(-35, 2);
      this.ctx.lineTo(-55, 0);
      this.ctx.lineTo(-35, -3);
      this.ctx.fill();
    }

    // HUD Tag above motorcycle
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.font = 'bold 8px Orbitron';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, 0, -14);

    this.ctx.restore();
  }

  drawCpuMarker() {
    // If CPU is way ahead or behind player, draw marker indicator at canvas edges
    const cpuRealX = this.player.x + (this.cpu.distance - this.player.distance) * this.pixelsPerMeter;
    
    if (cpuRealX < 15 || cpuRealX > this.canvas.width - 15) {
      this.ctx.save();
      const markerX = cpuRealX < 15 ? 20 : this.canvas.width - 20;
      const markerY = this.cpu.y;
      
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = this.cpu.color;
      this.ctx.fillStyle = this.cpu.color;

      // Draw blinking indicator triangle pointing in CPU direction
      const pulse = Math.abs(Math.sin(Date.now() * 0.01));
      this.ctx.globalAlpha = 0.3 + pulse * 0.7;

      this.ctx.beginPath();
      if (cpuRealX < 15) {
        // Pointing Left
        this.ctx.moveTo(markerX + 5, markerY - 8);
        this.ctx.lineTo(markerX - 5, markerY);
        this.ctx.lineTo(markerX + 5, markerY + 8);
      } else {
        // Pointing Right
        this.ctx.moveTo(markerX - 5, markerY - 8);
        this.ctx.lineTo(markerX + 5, markerY);
        this.ctx.lineTo(markerX - 5, markerY + 8);
      }
      this.ctx.fill();

      // CPU text label
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '8px Orbitron';
      this.ctx.textAlign = cpuRealX < 15 ? 'left' : 'right';
      this.ctx.fillText('CPU', cpuRealX < 15 ? markerX + 12 : markerX - 12, markerY + 3);
      this.ctx.restore();
    }
  }

  winRace() {
    this.gameState = 'win';
    this.audio.playWin();

    // Stats calculations
    const timeSec = (performance.now() - this.raceStartTime) / 1000;
    const minutes = Math.floor(timeSec / 60);
    const seconds = Math.floor(timeSec % 60);
    const ms = Math.floor((timeSec % 1) * 100);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    
    this.winTimeEl.textContent = timeStr;
    this.winMaxEl.textContent = `${Math.round(this.maxRecordedPlayerSpeed * 3.6)} KM/H`;
    
    this.winScreen.classList.remove('hidden');
  }

  loseRace() {
    this.gameState = 'lose';
    this.audio.playLose();

    this.loseDistEl.textContent = `${Math.round(this.player.distance)}m / ${this.trackLength}m`;
    this.loseScreen.classList.remove('hidden');
  }
}

// Helper utility to read CSS variables in fallback colors
function varOklch(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// Instantiate the game
window.addEventListener('DOMContentLoaded', () => {
  new CyberRiderGame();
});
