/**
 * AetherPhys - Premium Interactive Physics Engine & Simulator
 * Core physics logic, vector mathematics, solvers, render loops, and telemetry graphs.
 */

// ==========================================
// 1. HIGH-PERFORMANCE 2D VECTOR CLASS
// ==========================================
class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  clone() {
    return new Vector2D(this.x, this.y);
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }

  limit(max) {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.normalize().mult(max);
    }
    return this;
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
}

// ==========================================
// 2. SIMULATION NODE MODELS
// ==========================================

// --- GRAVITY MODEL NODE ---
class GravityNode {
  constructor(id, x, y, mass, vx = 0, vy = 0, color = null) {
    this.id = id;
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(vx, vy);
    this.acc = new Vector2D(0, 0);
    this.mass = mass;
    this.updateRadius();
    this.trail = [];
    this.maxTrailLength = 120;
    this.color = color || this.getRandomColor();
  }

  updateRadius() {
    // Volume scales with mass: r = cube_root(mass) * scale
    this.radius = Math.max(4, Math.cbrt(this.mass) * 2.2);
  }

  getRandomColor() {
    const colors = [
      '#06b6d4', // Cyan
      '#a855f7', // Purple
      '#ec4899', // Pink
      '#f59e0b', // Amber
      '#10b981', // Emerald
      '#3b82f6'  // Blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update(dt) {
    // Symplectic Euler (Preserves orbital energy better than Euler)
    this.vel.add(this.acc.clone().mult(dt));
    this.pos.add(this.vel.clone().mult(dt));
    this.acc.set(0, 0);

    // Save trail
    this.trail.push(this.pos.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  draw(ctx, showTrails) {
    // Draw trail
    if (showTrails && this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.color + '22'; // 12% opacity
      ctx.lineWidth = Math.max(1, this.radius * 0.15);
      ctx.stroke();
    }

    // Glow Effect
    ctx.save();
    ctx.shadowBlur = this.radius * 1.5;
    ctx.shadowColor = this.color;
    
    // Core body
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    
    // Sun-like interior gradient
    const grad = ctx.createRadialGradient(
      this.pos.x - this.radius * 0.2, this.pos.y - this.radius * 0.2, this.radius * 0.1,
      this.pos.x, this.pos.y, this.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, this.color);
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Subtle edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// --- ELECTROMAGNETISM NODE ---
class EMNode {
  constructor(id, x, y, charge, vx = 0, vy = 0) {
    this.id = id;
    this.pos = new Vector2D(x, y);
    this.vel = new Vector2D(vx, vy);
    this.acc = new Vector2D(0, 0);
    this.charge = charge; // +1 = Proton, -1 = Electron
    this.mass = charge > 0 ? 120 : 5; // Protons much heavier than electrons for inertia contrast
    this.radius = charge > 0 ? 8 : 5;
    this.color = charge > 0 ? '#ec4899' : '#06b6d4'; // Proton = Pink, Electron = Cyan
    this.trail = [];
    this.maxTrailLength = 180;
  }

  update(dt) {
    // Verlet/Symplectic integrator
    this.vel.add(this.acc.clone().mult(dt));
    this.pos.add(this.vel.clone().mult(dt));
    this.acc.set(0, 0);

    // Save trail
    this.trail.push(this.pos.clone());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  draw(ctx, showTrails) {
    if (showTrails && this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.color + '33';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowBlur = this.radius * 2;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Render Charge sign in the center (+ or -)
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${this.radius * 1.5}px var(--font-tech)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.charge > 0 ? '+' : '-', this.pos.x, this.pos.y);

    ctx.restore();
  }
}

// --- PARTICLE EMITTER GUN ---
class ParticleGun {
  constructor(x, y, angle, mode, charge = 1) {
    this.pos = new Vector2D(x, y);
    this.angle = angle;
    this.mode = mode; // 'gravity' or 'em'
    this.charge = charge;
    this.fireRate = 12; // Frames between fires
    this.frameCount = 0;
  }

  fire(speed, massVal) {
    const vx = Math.cos(this.angle) * speed;
    const vy = Math.sin(this.angle) * speed;
    const id = Date.now() + Math.random();

    if (this.mode === 'gravity') {
      return new GravityNode(id, this.pos.x, this.pos.y, massVal, vx, vy);
    } else {
      return new EMNode(id, this.pos.x, this.pos.y, this.charge, vx, vy);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    // Barrel glowing gradient
    const grad = ctx.createLinearGradient(0, -6, 25, -6);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(1, this.charge > 0 && this.mode === 'em' ? '#ec4899' : '#06b6d4');

    ctx.fillStyle = grad;
    ctx.fillRect(0, -6, 25, 12);
    
    // Emitter base ring
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// ==========================================
// 3. COLLISION ACCRETION PARTICLE SYSTEM
// ==========================================
class SplashParticle {
  constructor(x, y, color) {
    this.pos = new Vector2D(x, y);
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vel = new Vector2D(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.color = color;
    this.life = 1.0;
    this.decay = Math.random() * 0.03 + 0.02;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    this.pos.add(this.vel);
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// ==========================================
// 4. MAIN PHYSICS SIMULATOR CONTROLLER
// ==========================================
class PhysicsLaboratory {
  constructor() {
    this.canvas = document.getElementById('simulation-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Telemetry Canvas
    this.telCanvas = document.getElementById('telemetry-canvas');
    this.telCtx = this.telCanvas.getContext('2d');

    // Engine States
    this.activeMode = 'gravity'; // 'gravity' | 'em' | 'waves'
    this.isPlaying = true;
    this.simSpeed = 1.0;
    this.trailsStrength = 85;
    this.showVectors = true;
    
    // Physics Parameters (Sliders linked in bindEvents)
    this.gConstant = 1.0;
    this.spawnMass = 100;
    this.bField = 0.5;
    this.gunSpeed = 4.0;
    this.eConstant = 1.0;
    this.damping = 0.015;
    this.springK = 0.15;
    this.rippleAmp = 30;
    
    // Emitters and node systems
    this.nodes = [];
    this.emitters = [];
    this.splashParticles = [];
    
    // Wave spring system matrix
    this.waveColumns = 60;
    this.waveRows = 42;
    this.waveHeights = [];
    this.waveVelocities = [];
    this.waveBarriers = []; // 2D array of true/false
    this.initWaveGrid();

    // Mouse Tracking state
    this.mouse = {
      pos: new Vector2D(0, 0),
      isDown: false,
      dragStart: new Vector2D(0, 0),
      activeTool: 'place', // 'place' | 'slingshot' | 'emitter'
      targetNode: null
    };

    // Telemetry scroll tracking
    this.telemetryHistory = [];
    this.maxTelemetryPoints = 120;

    // Resizing
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Setup events & initial state
    this.bindEvents();
    this.loadPreset('stable-orbit');
    
    // Trigger loop
    this.loop();
  }

  // Set sizing dynamically based on viewport flexbox
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    // Virtual dimensions for internal logical tracking
    this.width = rect.width;
    this.height = rect.height;

    // Redraw Telemetry
    const telRect = this.telCanvas.getBoundingClientRect();
    this.telCanvas.width = telRect.width * dpr;
    this.telCanvas.height = telRect.height * dpr;
    this.telCtx.scale(dpr, dpr);
    this.telWidth = telRect.width;
    this.telHeight = telRect.height;
  }

  // --- WAVE SIMULATOR INITIALIZATION ---
  initWaveGrid() {
    this.waveHeights = new Float32Array(this.waveColumns * this.waveRows);
    this.waveVelocities = new Float32Array(this.waveColumns * this.waveRows);
    this.waveBarriers = new Uint8Array(this.waveColumns * this.waveRows);
    
    // Clear barrier data
    this.waveBarriers.fill(0);
    this.waveHeights.fill(0);
    this.waveVelocities.fill(0);
  }

  getWaveIdx(c, r) {
    return r * this.waveColumns + c;
  }

  // --- PRESETS SYSTEM ---
  loadPreset(presetName) {
    this.nodes = [];
    this.emitters = [];
    this.splashParticles = [];
    this.mouse.targetNode = null;
    document.getElementById('inspector-panel').style.display = 'none';

    const cx = this.width / 2;
    const cy = this.height / 2;

    switch (presetName) {
      // --- GRAVITY PRESETS ---
      case 'stable-orbit':
        // Core Sun
        this.nodes.push(new GravityNode(1, cx, cy, 1200, 0, 0, '#f59e0b'));
        // Planet 1 (Inner Circular)
        this.nodes.push(new GravityNode(2, cx, cy - 120, 20, 3.2, 0, '#06b6d4'));
        // Planet 2 (Outer circular with eccentric moon)
        this.nodes.push(new GravityNode(3, cx, cy + 220, 60, -2.4, 0, '#a855f7'));
        // Moon orbiting Planet 2
        this.nodes.push(new GravityNode(4, cx, cy + 245, 1, -3.4, 0, '#e2e8f0'));
        break;

      case 'three-body':
        // Highly chaotic dance of three stars
        const r = 130;
        const mass = 700;
        // Symmetric placement with perpendicular velocities
        this.nodes.push(new GravityNode(1, cx + r * Math.cos(0), cy + r * Math.sin(0), mass, -0.6, 1.4, '#ec4899'));
        this.nodes.push(new GravityNode(2, cx + r * Math.cos(2*Math.PI/3), cy + r * Math.sin(2*Math.PI/3), mass, 1.4, -0.5, '#06b6d4'));
        this.nodes.push(new GravityNode(3, cx + r * Math.cos(4*Math.PI/3), cy + r * Math.sin(4*Math.PI/3), mass, -0.8, -0.9, '#a855f7'));
        break;

      case 'binary-star':
        // Double massive stars rotating
        this.nodes.push(new GravityNode(1, cx - 80, cy, 800, 0, -1.8, '#ec4899'));
        this.nodes.push(new GravityNode(2, cx + 80, cy, 800, 0, 1.8, '#06b6d4'));
        // Tiny dust particle floating
        this.nodes.push(new GravityNode(3, cx + 180, cy + 10, 0.1, 0, 3.0, '#f59e0b'));
        break;

      case 'accretion':
        // Huge black hole centered, multiple dust particles orbiting
        this.nodes.push(new GravityNode(1, cx, cy, 1800, 0, 0, '#6366f1'));
        for (let i = 0; i < 40; i++) {
          const radiusDist = Math.random() * 150 + 60;
          const angle = Math.random() * Math.PI * 2;
          const orbitalVel = Math.sqrt((this.gConstant * 1800) / radiusDist);
          this.nodes.push(new GravityNode(
            Date.now() + i,
            cx + Math.cos(angle) * radiusDist,
            cy + Math.sin(angle) * radiusDist,
            Math.random() * 4 + 0.5,
            -Math.sin(angle) * orbitalVel,
            Math.cos(angle) * orbitalVel,
            'rgba(6, 182, 212, 0.7)'
          ));
        }
        break;

      // --- EM PRESETS ---
      case 'cyclotron':
        // Constant magnetic field, particle emitter gun at bottom shooting electrons
        this.bField = 0.8;
        document.getElementById('slider-b-field').value = 0.8;
        document.getElementById('val-b-field').innerText = '0.80';
        
        // Emitter shoot proton to make cyclotron track
        this.emitters.push(new ParticleGun(cx - 100, cy + 120, -Math.PI / 2, 'em', -1)); // Electron gun shooting up
        break;

      case 'dipole-attract':
        // Place stationary positive and negative charges
        this.nodes.push(new EMNode(1, cx - 120, cy, 15)); // High positive charge
        this.nodes[0].mass = 10000; // Locked in place
        this.nodes[0].vel.set(0, 0);

        this.nodes.push(new EMNode(2, cx + 120, cy, -15)); // High negative charge
        this.nodes[1].mass = 10000; // Locked
        this.nodes[1].vel.set(0, 0);

        // Place a gun shooting electrons
        this.emitters.push(new ParticleGun(cx, cy - 140, 0, 'em', -1));
        break;

      case 'magnetic-mirror':
        // Strong magnetic fields, shoot particles into it to bounce
        this.bField = 1.5;
        document.getElementById('slider-b-field').value = 1.5;
        document.getElementById('val-b-field').innerText = '1.50';
        
        this.emitters.push(new ParticleGun(60, cy, 0, 'em', 1));
        this.emitters.push(new ParticleGun(this.width - 60, cy, Math.PI, 'em', -1));
        break;

      case 'coulomb-scattering':
        // High gold nucleus charge in the center, shoot protons to show path deflection
        this.nodes.push(new EMNode(1, cx, cy, 30));
        this.nodes[0].mass = 10000; // Heavy
        this.nodes[0].vel.set(0,0);
        
        // Emitter shooting protons in a row
        this.emitters.push(new ParticleGun(cx - 250, cy - 40, 0, 'em', 1));
        break;

      // --- WAVES PRESETS ---
      case 'center-drip':
        this.initWaveGrid();
        // Trigger ripples at the center periodically using timer or single burst
        const idx = this.getWaveIdx(Math.floor(this.waveColumns/2), Math.floor(this.waveRows/2));
        this.waveHeights[idx] = 120;
        break;

      case 'double-slit':
        this.initWaveGrid();
        // Construct horizontal block lines with two small gaps in the middle
        const barrierRow = Math.floor(this.waveRows / 3);
        const slit1 = Math.floor(this.waveColumns / 3 + 3);
        const slit2 = Math.floor((this.waveColumns / 3) * 2 - 3);

        for (let c = 0; c < this.waveColumns; c++) {
          if (c !== slit1 && c !== slit1 + 1 && c !== slit2 && c !== slit2 + 1) {
            this.waveBarriers[this.getWaveIdx(c, barrierRow)] = 1;
          }
        }
        // Place wave exciter source behind barrier
        this.emitters.push(new ParticleGun(cx, 120, Math.PI / 2, 'waves'));
        break;

      case 'boundary-resonance':
        this.initWaveGrid();
        // Put a box border around the simulation with a center excitation
        for (let c = 5; c < this.waveColumns - 5; c++) {
          this.waveBarriers[this.getWaveIdx(c, 5)] = 1;
          this.waveBarriers[this.getWaveIdx(c, this.waveRows - 6)] = 1;
        }
        for (let r = 5; r < this.waveRows - 5; r++) {
          this.waveBarriers[this.getWaveIdx(5, r)] = 1;
          this.waveBarriers[this.getWaveIdx(this.waveColumns - 6, r)] = 1;
        }
        
        // Initial circular splash in center
        const cX = Math.floor(this.waveColumns/2);
        const cY = Math.floor(this.waveRows/2);
        this.waveHeights[this.getWaveIdx(cX, cY)] = 100;
        break;

      case 'barrier-scattering':
        this.initWaveGrid();
        // Place diagonal structures
        const startC = Math.floor(this.waveColumns / 4);
        const startR = Math.floor(this.waveRows / 2);
        for(let i=0; i<15; i++) {
          this.waveBarriers[this.getWaveIdx(startC + i, startR + Math.floor(i/1.5))] = 1;
        }
        // Continuous wave shooting from top left
        this.emitters.push(new ParticleGun(60, 60, Math.PI / 4, 'waves'));
        break;

      case 'empty':
      case 'empty-em':
      case 'flat-calm':
        this.initWaveGrid();
        break;
    }
  }

  // --- UI EVENT BINDINGS ---
  bindEvents() {
    // Mode Switching Tab clicks
    const modes = ['gravity', 'em', 'waves'];
    modes.forEach(mode => {
      document.getElementById(`btn-mode-${mode}`).addEventListener('click', () => {
        modes.forEach(m => {
          document.getElementById(`btn-mode-${m}`).classList.remove('active');
          document.getElementById(`settings-${m}`).style.display = 'none';
        });
        
        this.activeMode = mode;
        document.getElementById(`btn-mode-${mode}`).classList.add('active');
        document.getElementById(`settings-${mode}`).style.display = 'block';

        // Apply corresponding class glows
        const aside = document.getElementById('sidebar');
        aside.classList.remove('glow-cyan', 'glow-purple', 'glow-pink');
        if (mode === 'gravity') aside.classList.add('glow-purple');
        if (mode === 'em') aside.classList.add('glow-cyan');
        if (mode === 'waves') aside.classList.add('glow-pink');

        // Set default preset selector match
        const presetId = `preset-${mode}`;
        this.loadPreset(document.getElementById(presetId).value);

        // Update telemetry subtitle label
        const modeLabels = { gravity: 'Orbit Energy', em: 'Field Telemetry', waves: 'Mesh Energy' };
        document.getElementById('telemetry-mode-label').innerText = modeLabels[mode];
      });
    });

    // Preset select element changes
    document.getElementById('preset-gravity').addEventListener('change', (e) => this.loadPreset(e.target.value));
    document.getElementById('preset-em').addEventListener('change', (e) => this.loadPreset(e.target.value));
    document.getElementById('preset-waves').addEventListener('change', (e) => this.loadPreset(e.target.value));

    // Core buttons
    const btnPlay = document.getElementById('btn-play-pause');
    btnPlay.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      document.getElementById('play-pause-icon').innerText = this.isPlaying ? '⏸' : '▶';
      document.getElementById('play-pause-text').innerText = this.isPlaying ? 'Pause' : 'Resume';
    });

    document.getElementById('btn-clear-all').addEventListener('click', () => {
      this.nodes = [];
      this.emitters = [];
      this.splashParticles = [];
      this.initWaveGrid();
      this.mouse.targetNode = null;
      document.getElementById('inspector-panel').style.display = 'none';
    });

    // Engine Sliders
    const linkSlider = (sliderId, valueId, suffix, callback) => {
      const slider = document.getElementById(sliderId);
      const output = document.getElementById(valueId);
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        output.innerText = val.toFixed(suffix === '%' || slider.step >= '1' ? 0 : 2) + suffix;
        callback(val);
      });
    };

    linkSlider('slider-sim-speed', 'val-sim-speed', 'x', (v) => this.simSpeed = v);
    linkSlider('slider-trails', 'val-trails', '%', (v) => this.trailsStrength = v);
    linkSlider('slider-g-constant', 'val-g-constant', '', (v) => this.gConstant = v);
    linkSlider('slider-node-mass', 'val-node-mass', '', (v) => this.spawnMass = v);
    linkSlider('slider-b-field', 'val-b-field', '', (v) => this.bField = v);
    linkSlider('slider-gun-speed', 'val-gun-speed', '', (v) => this.gunSpeed = v);
    linkSlider('slider-e-constant', 'val-e-constant', '', (v) => this.eConstant = v);
    linkSlider('slider-damping', 'val-damping', '', (v) => this.damping = v);
    linkSlider('slider-spring-k', 'val-spring-k', '', (v) => this.springK = v);
    linkSlider('slider-ripple-amp', 'val-ripple-amp', '', (v) => this.rippleAmp = v);

    // Floating Tool Buttons
    const tools = ['place', 'slingshot', 'emitter', 'vectors'];
    tools.forEach(tool => {
      const btn = document.getElementById(`tool-${tool}`);
      btn.addEventListener('click', () => {
        if (tool === 'vectors') {
          this.showVectors = !this.showVectors;
          btn.classList.toggle('active', this.showVectors);
          return;
        }
        tools.forEach(t => {
          if (t !== 'vectors') document.getElementById(`tool-${t}`).classList.remove('active');
        });
        this.mouse.activeTool = tool;
        btn.classList.add('active');
      });
    });

    // Inspector Close
    document.getElementById('btn-inspector-close').addEventListener('click', () => {
      this.mouse.targetNode = null;
      document.getElementById('inspector-panel').style.display = 'none';
    });

    // MOUSE & TOUCH SIMULATION HOOKS
    const getMousePos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return new Vector2D(clientX - rect.left, clientY - rect.top);
    };

    const handleStart = (e) => {
      this.mouse.isDown = true;
      const pos = getMousePos(e);
      this.mouse.pos.copy(pos);
      this.mouse.dragStart.copy(pos);

      // Waves Interaction
      if (this.activeMode === 'waves') {
        const gridX = Math.floor((pos.x / this.width) * this.waveColumns);
        const gridY = Math.floor((pos.y / this.height) * this.waveRows);
        
        if (gridX >= 0 && gridX < this.waveColumns && gridY >= 0 && gridY < this.waveRows) {
          const drawBarrierSelected = document.getElementById('click-barrier').checked;
          if (drawBarrierSelected) {
            const idx = this.getWaveIdx(gridX, gridY);
            this.waveBarriers[idx] = this.waveBarriers[idx] ? 0 : 1; // Toggle barrier
          } else {
            this.triggerWaveImpulse(gridX, gridY, this.rippleAmp);
          }
        }
        return;
      }

      // Check if clicked near an existing node to Inspect/Select
      let clickedNode = null;
      for (let n of this.nodes) {
        if (n.pos.dist(pos) < Math.max(12, n.radius + 8)) {
          clickedNode = n;
          break;
        }
      }

      if (clickedNode) {
        this.mouse.targetNode = clickedNode;
        this.openInspector(clickedNode);
        
        // Dragging existing node if in gravity mode
        if (this.mouse.activeTool === 'place') {
          this.mouse.isDraggingNode = true;
        }
      } else {
        // Deselect inspector if clicked in vacuum
        if (this.mouse.activeTool !== 'slingshot') {
          this.mouse.targetNode = null;
          document.getElementById('inspector-panel').style.display = 'none';
        }
      }
    };

    const handleMove = (e) => {
      const pos = getMousePos(e);
      this.mouse.pos.copy(pos);

      if (!this.mouse.isDown) {
        // Hover inspect nodes
        let hoverNode = null;
        for (let n of this.nodes) {
          if (n.pos.dist(pos) < n.radius + 6) {
            hoverNode = n;
            break;
          }
        }
        if (hoverNode) this.openInspector(hoverNode);
        return;
      }

      // Waves dragging effect
      if (this.activeMode === 'waves') {
        const gridX = Math.floor((pos.x / this.width) * this.waveColumns);
        const gridY = Math.floor((pos.y / this.height) * this.waveRows);
        if (gridX >= 0 && gridX < this.waveColumns && gridY >= 0 && gridY < this.waveRows) {
          const drawBarrierSelected = document.getElementById('click-barrier').checked;
          if (drawBarrierSelected) {
            this.waveBarriers[this.getWaveIdx(gridX, gridY)] = 1; // Continuous paint
          } else {
            this.triggerWaveImpulse(gridX, gridY, this.rippleAmp * 0.15); // continuous drip ripple
          }
        }
        return;
      }

      // Drag existing node
      if (this.mouse.isDraggingNode && this.mouse.targetNode) {
        this.mouse.targetNode.pos.copy(pos);
        this.mouse.targetNode.vel.set(0, 0); // Lock kinetic vector during drag
        this.mouse.targetNode.trail = [];
      }
    };

    const handleEnd = (e) => {
      this.mouse.isDown = false;
      this.mouse.isDraggingNode = false;
      const pos = this.mouse.pos;

      if (this.activeMode === 'waves') return;

      // Spawn Action
      if (!this.mouse.targetNode) {
        const dx = pos.x - this.mouse.dragStart.x;
        const dy = pos.y - this.mouse.dragStart.y;
        
        if (this.mouse.activeTool === 'place') {
          // Double check space coordinates to prevent immediate collisions on spawn
          const id = Date.now();
          if (this.activeMode === 'gravity') {
            this.nodes.push(new GravityNode(id, this.mouse.dragStart.x, this.mouse.dragStart.y, this.spawnMass));
          } else {
            const chargeSign = document.getElementById('spawn-proton').checked ? 1 : -1;
            this.nodes.push(new EMNode(id, this.mouse.dragStart.x, this.mouse.dragStart.y, chargeSign));
          }
        } 
        else if (this.mouse.activeTool === 'slingshot') {
          // Launch node using drag delta vector as initial velocity
          const id = Date.now();
          const speedFactor = 0.08;
          const vx = dx * speedFactor;
          const vy = dy * speedFactor;
          if (this.activeMode === 'gravity') {
            this.nodes.push(new GravityNode(id, this.mouse.dragStart.x, this.mouse.dragStart.y, this.spawnMass, vx, vy));
          } else {
            const chargeSign = document.getElementById('spawn-proton').checked ? 1 : -1;
            this.nodes.push(new EMNode(id, this.mouse.dragStart.x, this.mouse.dragStart.y, chargeSign, vx, vy));
          }
        }
        else if (this.mouse.activeTool === 'emitter') {
          // Place continuous gun directed in drag vector angle
          const angle = Math.atan2(dy, dx);
          if (this.activeMode === 'gravity') {
            this.emitters.push(new ParticleGun(this.mouse.dragStart.x, this.mouse.dragStart.y, angle, 'gravity'));
          } else {
            const chargeSign = document.getElementById('spawn-proton').checked ? 1 : -1;
            this.emitters.push(new ParticleGun(this.mouse.dragStart.x, this.mouse.dragStart.y, angle, 'em', chargeSign));
          }
        }
      }
    };

    // Add pointer events for unified mouse/touch controls
    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); });
    window.addEventListener('touchend', handleEnd);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        btnPlay.click();
      }
      if (e.code === 'KeyC') {
        document.getElementById('btn-clear-all').click();
      }
      if (e.code === 'Escape') {
        this.mouse.targetNode = null;
        document.getElementById('inspector-panel').style.display = 'none';
      }
    });
  }

  // Soft Wave impulse excitation
  triggerWaveImpulse(cx, cy, amp) {
    const radius = 3;
    for (let r = -radius; r <= radius; r++) {
      for (let c = -radius; c <= radius; c++) {
        const currC = cx + c;
        const currR = cy + r;
        if (currC >= 0 && currC < this.waveColumns && currR >= 0 && currR < this.waveRows) {
          const dist = Math.sqrt(r * r + c * c);
          if (dist < radius) {
            const idx = this.getWaveIdx(currC, currR);
            if (!this.waveBarriers[idx]) {
              // Gaussian impulse multiplier
              const weight = Math.cos((dist / radius) * Math.PI * 0.5);
              this.waveHeights[idx] += amp * weight;
            }
          }
        }
      }
    }
  }

  // --- INSPECTOR READOUT UPDATES ---
  openInspector(node) {
    document.getElementById('inspector-panel').style.display = 'block';
    
    let typeName = 'Mass Node';
    let valString = node.mass ? node.mass.toFixed(1) : '0.0';

    if (node instanceof GravityNode) {
      typeName = node.mass > 600 ? 'Supermassive Sun' : node.mass > 100 ? 'Giant Planet' : 'Satellite Particle';
    } else if (node instanceof EMNode) {
      typeName = node.charge > 0 ? 'Proton Core (+q)' : 'Electron Wave (-q)';
      valString = `q = ${node.charge > 0 ? '+' : '-'}${Math.abs(node.charge)}`;
    }

    document.getElementById('inspect-type').innerText = typeName;
    document.getElementById('inspect-mass').innerText = valString;
    document.getElementById('inspect-pos').innerText = `(${node.pos.x.toFixed(0)}, ${node.pos.y.toFixed(0)})`;
    
    const velocity = node.vel.mag();
    document.getElementById('inspect-vel').innerText = `${(velocity * 60).toFixed(1)} px/s`;

    const accForce = node.acc.mag() * (node.mass || 1);
    document.getElementById('inspect-force').innerText = `${(accForce * 10).toFixed(1)} N`;
  }

  // ==========================================
  // 5. CORE PHYSICS CALCULATOR SOLVER
  // ==========================================
  updatePhysics() {
    if (!this.isPlaying) return;

    // Sub-stepping iterations for high velocity orbital precision
    const subSteps = 8;
    const dt = (1.0 / 60.0) * this.simSpeed / subSteps;

    for (let step = 0; step < subSteps; step++) {
      
      // A. GRAVITY AND ELECTROMAGNETIC MODE PARTICLE ENGINE
      if (this.activeMode === 'gravity' || this.activeMode === 'em') {
        const len = this.nodes.length;
        
        // 1. Calculate Pairwise interactions
        for (let i = 0; i < len; i++) {
          const nodeA = this.nodes[i];
          if (!nodeA) continue;

          for (let j = i + 1; j < len; j++) {
            const nodeB = this.nodes[j];
            if (!nodeB) continue;

            const dx = nodeB.pos.x - nodeA.pos.x;
            const dy = nodeB.pos.y - nodeA.pos.y;
            const distSq = dx * dx + dy * dy;
            
            // Softening radius prevents division by zero and launches
            const softening = this.activeMode === 'gravity' ? 100 : 25; 
            const dist = Math.sqrt(distSq + softening);

            // Gravitational Forces
            if (this.activeMode === 'gravity') {
              const forceMag = (this.gConstant * nodeA.mass * nodeB.mass) / (distSq + softening);
              const fx = (dx / dist) * forceMag;
              const fy = (dy / dist) * forceMag;

              // Node A experiences attraction to Node B
              nodeA.acc.x += fx / nodeA.mass;
              nodeA.acc.y += fy / nodeA.mass;

              // Node B experiences equal opposite reaction
              nodeB.acc.x -= fx / nodeB.mass;
              nodeB.acc.y -= fy / nodeB.mass;

              // Collision Merge Check
              const mergeDist = nodeA.radius + nodeB.radius;
              if (distSq < mergeDist * mergeDist) {
                this.resolveGravityCollision(nodeA, nodeB, i, j);
              }
            } 
            // Coulomb Electrostatic Forces
            else if (this.activeMode === 'em') {
              // Opposites attract (- * + < 0), Likes repel (+ * + > 0)
              const chargeProd = nodeA.charge * nodeB.charge;
              const forceMag = -1 * (this.eConstant * 50 * chargeProd) / (distSq + softening);
              const fx = (dx / dist) * forceMag;
              const fy = (dy / dist) * forceMag;

              nodeA.acc.x += fx / nodeA.mass;
              nodeA.acc.y += fy / nodeA.mass;

              nodeB.acc.x -= fx / nodeB.mass;
              nodeB.acc.y -= fy / nodeB.mass;
            }
          }

          // 2. Apply Boundary Field Lorentz Forces (EM Mode only)
          if (this.activeMode === 'em') {
            // Lorentz B Force: F = q * (v x B)
            // v_x_new = v_y * B, v_y_new = -v_x * B
            const bForceX = nodeA.charge * nodeA.vel.y * this.bField;
            const bForceY = -nodeA.charge * nodeA.vel.x * this.bField;
            
            nodeA.acc.x += bForceX / nodeA.mass;
            nodeA.acc.y += bForceY / nodeA.mass;
          }
        }

        // 3. Integrate motion kinematics equations
        for (let i = 0; i < this.nodes.length; i++) {
          const n = this.nodes[i];
          n.update(dt);

          // Boundary rebound reflection or boundary deletion
          const pad = n.radius;
          if (this.activeMode === 'gravity') {
            // Gravity bounces gently off boundary edges
            if (n.pos.x < pad) { n.pos.x = pad; n.vel.x *= -0.7; }
            if (n.pos.x > this.width - pad) { n.pos.x = this.width - pad; n.vel.x *= -0.7; }
            if (n.pos.y < pad) { n.pos.y = pad; n.vel.y *= -0.7; }
            if (n.pos.y > this.height - pad) { n.pos.y = this.height - pad; n.vel.y *= -0.7; }
          } else {
            // EM charged particles delete when escaping bounds to keep simulator quick
            if (n.pos.x < -100 || n.pos.x > this.width + 100 || n.pos.y < -100 || n.pos.y > this.height + 100) {
              if (this.mouse.targetNode === n) {
                this.mouse.targetNode = null;
                document.getElementById('inspector-panel').style.display = 'none';
              }
              this.nodes.splice(i, 1);
              i--;
            }
          }
        }
      }

      // B. WAVES 2D SPRING-LATTICE ENGINE
      else if (this.activeMode === 'waves') {
        const cLimit = this.waveColumns;
        const rLimit = this.waveRows;

        // Discrete finite difference wave mechanics
        for (let r = 0; r < rLimit; r++) {
          for (let c = 0; c < cLimit; c++) {
            const idx = this.getWaveIdx(c, r);
            
            // Skip calculations if cell is an solid barrier
            if (this.waveBarriers[idx]) {
              this.waveHeights[idx] = 0;
              this.waveVelocities[idx] = 0;
              continue;
            }

            // Neighbor height values
            const hC = this.waveHeights[idx];
            const hL = c > 0 ? this.waveHeights[idx - 1] : hC; // Absorbing bounds
            const hR = c < cLimit - 1 ? this.waveHeights[idx + 1] : hC;
            const hT = r > 0 ? this.waveHeights[idx - cLimit] : hC;
            const hB = r < rLimit - 1 ? this.waveHeights[idx + cLimit] : hC;

            // Spring tension acceleration
            const laplacian = hL + hR + hT + hB - 4 * hC;
            const force = laplacian * this.springK;
            
            // Apply viscosity damping
            this.waveVelocities[idx] += force - this.waveVelocities[idx] * this.damping;
          }
        }

        // Apply changes and incorporate absorbing edge boundary factors
        for (let idx = 0; idx < this.waveHeights.length; idx++) {
          if (!this.waveBarriers[idx]) {
            this.waveHeights[idx] += this.waveVelocities[idx];
          }
        }
      }
    }

    // Particle emitter guns continuous triggers
    this.emitters.forEach(gun => {
      gun.frameCount++;
      if (gun.frameCount >= gun.fireRate) {
        gun.frameCount = 0;
        
        if (this.activeMode === 'waves') {
          // Wave emitters excite spring lattice periodically
          const gridX = Math.floor((gun.pos.x / this.width) * this.waveColumns);
          const gridY = Math.floor((gun.pos.y / this.height) * this.waveRows);
          this.triggerWaveImpulse(gridX, gridY, 40);
        } else {
          // Gravity / EM guns fire normal nodes
          this.nodes.push(gun.fire(this.gunSpeed, this.spawnMass));
        }
      }
    });

    // Splash Particles
    this.splashParticles.forEach((p, idx) => {
      p.update();
      if (p.life <= 0) this.splashParticles.splice(idx, 1);
    });

    // Update active inspector node values
    if (this.mouse.targetNode) {
      this.openInspector(this.mouse.targetNode);
    }
  }

  // --- MERGING CELESTIAL BODIES ---
  resolveGravityCollision(nodeA, nodeB, idxA, idxB) {
    // Conservation of momentum: v_final = (m1*v1 + m2*v2) / (m1+m2)
    const totalMass = nodeA.mass + nodeB.mass;
    
    // Weighted position average (moves center of mass smoothly)
    const newX = (nodeA.pos.x * nodeA.mass + nodeB.pos.x * nodeB.mass) / totalMass;
    const newY = (nodeA.pos.y * nodeA.mass + nodeB.pos.y * nodeB.mass) / totalMass;

    const vx = (nodeA.vel.x * nodeA.mass + nodeB.vel.x * nodeB.mass) / totalMass;
    const vy = (nodeA.vel.y * nodeA.mass + nodeB.vel.y * nodeB.mass) / totalMass;

    // Node A absorbs Node B
    nodeA.mass = totalMass;
    nodeA.pos.set(newX, newY);
    nodeA.vel.set(vx, vy);
    nodeA.updateRadius();

    // Trigger splash rings
    const splashColor = nodeA.mass > nodeB.mass ? nodeA.color : nodeB.color;
    for (let i = 0; i < 15; i++) {
      this.splashParticles.push(new SplashParticle(newX, newY, splashColor));
    }

    // Set selection focus onto survivor
    if (this.mouse.targetNode === nodeB) {
      this.mouse.targetNode = nodeA;
    }

    // Remove B node
    this.nodes.splice(idxB, 1);
  }

  // ==========================================
  // 6. DETAILED FIELD AND HUD GRAPHICS RENDERING
  // ==========================================
  draw() {
    // 1. Core simulation space background blending (for trails support)
    const trailOpacity = (100 - this.trailsStrength) / 100;
    
    if (this.trailsStrength > 0 && this.activeMode !== 'waves') {
      this.ctx.fillStyle = `rgba(7, 9, 14, ${trailOpacity})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.fillStyle = '#07090e';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Draw field background grids
    this.drawBackgroundGrid();

    // 2. Draw EM electric field vector arrow overlays
    if (this.showVectors && this.activeMode === 'em') {
      this.drawEMElectricFields();
    }

    // 3. Draw active Wave Mechanics Lattice
    if (this.activeMode === 'waves') {
      this.drawWaveLattice();
    }

    // 4. Draw active interactive gravity orbits trajectory preview
    if (this.mouse.isDown && !this.mouse.targetNode && this.activeMode !== 'waves') {
      this.drawTrajectoryPreview();
    }

    // 5. Draw physics nodes
    if (this.activeMode !== 'waves') {
      this.nodes.forEach(n => n.draw(this.ctx, this.trailsStrength > 0));
    }

    // 6. Draw particle spray guns
    this.emitters.forEach(gun => gun.draw(this.ctx));

    // 7. Draw splash rings
    this.splashParticles.forEach(p => p.draw(this.ctx));

    // 8. Selected node highlight halo
    if (this.mouse.targetNode && this.activeMode !== 'waves') {
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.targetNode.pos.x, this.mouse.targetNode.pos.y, this.mouse.targetNode.radius + 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 9. Telemetry stream tracking
    this.updateTelemetryGraph();
  }

  // Subtle technological coordinate grid background
  drawBackgroundGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
    this.ctx.lineWidth = 1;
    const spacing = 50;

    // Draw vertical lines
    for (let x = 0; x < this.width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    // Horizontal
    for (let y = 0; y < this.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    
    // In EM mode, show magnetic field B entering/leaving viewport visual indicator
    if (this.activeMode === 'em' && Math.abs(this.bField) > 0.05) {
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.02)';
      this.ctx.font = '10px var(--font-code)';
      this.ctx.textAlign = 'right';
      const indicator = this.bField > 0 ? '☉ B-FIELD (OUT OF CANVAS)' : '⊗ B-FIELD (INTO CANVAS)';
      this.ctx.fillText(indicator, this.width - 20, 30);
    }
    this.ctx.restore();
  }

  // Draw Electromagnetism Vector arrows representing Electric Field Forces
  drawEMElectricFields() {
    const spacing = 40; // Pixels between vector probes
    const arrowMaxLen = 15;

    this.ctx.save();
    this.ctx.lineWidth = 1.2;

    for (let x = spacing / 2; x < this.width; x += spacing) {
      for (let y = spacing / 2; y < this.height; y += spacing) {
        const probePos = new Vector2D(x, y);
        const fieldE = new Vector2D(0, 0); // Net electrostatic force vector on imaginary positive test charge

        // Accumulate field strength from each EMNode
        this.nodes.forEach(n => {
          const dx = probePos.x - n.pos.x;
          const dy = probePos.y - n.pos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq + 200);

          if (distSq > 100) {
            // E = k * q / r^2
            const strength = (this.eConstant * 10 * n.charge) / distSq;
            fieldE.x += (dx / dist) * strength;
            fieldE.y += (dy / dist) * strength;
          }
        });

        const intensity = fieldE.mag();
        if (intensity > 0.01) {
          fieldE.normalize();
          
          const alpha = Math.min(0.25, intensity * 2.0); // opacity based on vector strength
          this.ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
          this.ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
          
          const length = Math.min(arrowMaxLen, intensity * 150 + 2);
          const endX = x + fieldE.x * length;
          const endY = y + fieldE.y * length;

          // Draw probe arrow lines
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(endX, endY);
          this.ctx.stroke();

          // Arrow head
          const angle = Math.atan2(fieldE.y, fieldE.x);
          this.ctx.beginPath();
          this.ctx.moveTo(endX, endY);
          this.ctx.lineTo(endX - 4 * Math.cos(angle - Math.PI/6), endY - 4 * Math.sin(angle - Math.PI/6));
          this.ctx.lineTo(endX - 4 * Math.cos(angle + Math.PI/6), endY - 4 * Math.sin(angle + Math.PI/6));
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
    }
    this.ctx.restore();
  }

  // Draw fluid wave mechanics grid height map
  drawWaveLattice() {
    this.ctx.save();
    const cellW = this.width / this.waveColumns;
    const cellH = this.height / this.waveRows;

    for (let r = 0; r < this.waveRows; r++) {
      for (let c = 0; c < this.waveColumns; c++) {
        const idx = this.getWaveIdx(c, r);
        const x = c * cellW;
        const y = r * cellH;

        if (this.waveBarriers[idx]) {
          // Render barriers as nice glass brick components
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          this.ctx.lineWidth = 1;
          this.ctx.fillRect(x, y, cellW, cellH);
          this.ctx.strokeRect(x, y, cellW, cellH);
        } else {
          // Color based on node height displacement
          const height = this.waveHeights[idx];
          
          if (Math.abs(height) > 0.02) {
            // Math.max/min boundary scaling
            const strength = Math.min(1.0, Math.abs(height) / 45);
            
            let fillStyle;
            if (height > 0) {
              // Positive heights glow Pink/Red
              fillStyle = `rgba(236, 72, 153, ${strength * 0.7})`;
            } else {
              // Negative heights glow Cyan/Blue
              fillStyle = `rgba(6, 182, 212, ${strength * 0.7})`;
            }
            
            this.ctx.fillStyle = fillStyle;
            this.ctx.fillRect(x, y, cellW, cellH);
          }
        }
      }
    }
    this.ctx.restore();
  }

  // Orbital mechanics trajectory prediction path launcher sling drawing
  drawTrajectoryPreview() {
    this.ctx.save();
    
    // Slingshot rubber band preview
    if (this.mouse.activeTool === 'slingshot') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.mouse.dragStart.x, this.mouse.dragStart.y);
      this.ctx.lineTo(this.mouse.pos.x, this.mouse.pos.y);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw vector head
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.dragStart.x, this.mouse.dragStart.y, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
    }

    // Lightweight numerical orbit prediction (Virtual Euler leap-frog steps)
    if (this.activeMode === 'gravity' && this.nodes.length > 0) {
      const predSteps = 160;
      const predDt = 0.15;
      
      // Copy active bodies states
      const virtualBodies = this.nodes.map(n => ({
        pos: n.pos.clone(),
        vel: n.vel.clone(),
        mass: n.mass
      }));

      // Create new virtual node launched from click position
      let dragVel = new Vector2D(0, 0);
      if (this.mouse.activeTool === 'slingshot') {
        const dx = this.mouse.pos.x - this.mouse.dragStart.x;
        const dy = this.mouse.pos.y - this.mouse.dragStart.y;
        dragVel.set(dx * 0.08, dy * 0.08);
      }
      
      const testNode = {
        pos: this.mouse.dragStart.clone(),
        vel: dragVel,
        mass: this.spawnMass
      };

      const pathPoints = [];

      for (let s = 0; s < predSteps; s++) {
        const acc = new Vector2D(0, 0);

        // Standard gravity calculations on virtual bodies
        virtualBodies.forEach(b => {
          const dx = b.pos.x - testNode.pos.x;
          const dy = b.pos.y - testNode.pos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq + 120);

          if (distSq > 50) {
            const force = (this.gConstant * testNode.mass * b.mass) / distSq;
            acc.x += (dx / dist) * force / testNode.mass;
            acc.y += (dy / dist) * force / testNode.mass;
          }
        });

        // Integrate prediction
        testNode.vel.add(acc.mult(predDt));
        testNode.pos.add(testNode.vel.clone().mult(predDt));
        pathPoints.push(testNode.pos.clone());

        // Also update virtual nodes coordinates to keep simulation authentic
        for(let i=0; i<virtualBodies.length; i++) {
          const b1 = virtualBodies[i];
          const bAcc = new Vector2D(0, 0);
          
          for(let j=0; j<virtualBodies.length; j++) {
            if(i === j) continue;
            const b2 = virtualBodies[j];
            const dx = b2.pos.x - b1.pos.x;
            const dy = b2.pos.y - b1.pos.y;
            const dSq = dx * dx + dy * dy;
            const d = Math.sqrt(dSq + 120);
            
            if(dSq > 50) {
              const f = (this.gConstant * b1.mass * b2.mass) / dSq;
              bAcc.x += (dx / d) * f / b1.mass;
              bAcc.y += (dy / d) * f / b1.mass;
            }
          }
          b1.vel.add(bAcc.mult(predDt));
          b1.pos.add(b1.vel.clone().mult(predDt));
        }
      }

      // Draw predicted dotted path
      this.ctx.beginPath();
      if (pathPoints.length > 0) {
        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length; i += 2) {
          this.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
      }
      this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
      this.ctx.lineWidth = 1.2;
      this.ctx.setLineDash([2, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    this.ctx.restore();
  }

  // ==========================================
  // 7. REAL-TIME ENERGY TELEMETRY GRAPH
  // ==========================================
  updateTelemetryGraph() {
    let ke = 0;
    let pe = 0;
    
    // Calculate energies based on active modes
    if (this.activeMode === 'gravity') {
      this.nodes.forEach(n => {
        ke += 0.5 * n.mass * n.vel.magSq();
      });

      // Potential Gravity: U = -G * m1 * m2 / r
      const len = this.nodes.length;
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          const dist = this.nodes[i].pos.dist(this.nodes[j].pos);
          if (dist > 5) {
            pe -= (this.gConstant * this.nodes[i].mass * this.nodes[j].mass) / dist;
          }
        }
      }
    } 
    else if (this.activeMode === 'em') {
      this.nodes.forEach(n => {
        ke += 0.5 * n.mass * n.vel.magSq();
      });

      // Potential Coulomb electrostatic: U = ke * q1 * q2 / r
      const len = this.nodes.length;
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          const dist = this.nodes[i].pos.dist(this.nodes[j].pos);
          if (dist > 5) {
            pe += (this.eConstant * 100 * this.nodes[i].charge * this.nodes[j].charge) / dist;
          }
        }
      }
    } 
    else if (this.activeMode === 'waves') {
      // Numerical mesh kinetic (velocity squared sum) and tension potential
      for (let idx = 0; idx < this.waveHeights.length; idx++) {
        if (!this.waveBarriers[idx]) {
          ke += 0.15 * this.waveVelocities[idx] * this.waveVelocities[idx];
          ke += 0.15 * this.waveHeights[idx] * this.waveHeights[idx]; // visual oscillation potential representation
        }
      }
      pe = -0.5 * ke; // Standard inverse scale for wave aesthetics in chart
    }

    const scaleEnergy = 0.02; // Normalized scaling factor
    const scalarKE = ke * scaleEnergy;
    const scalarPE = pe * scaleEnergy;
    const scalarTotal = scalarKE + scalarPE;

    // Stream readouts inside DOM panels
    document.getElementById('stat-ke').innerText = Math.abs(ke).toFixed(0);
    document.getElementById('stat-pe').innerText = pe.toFixed(0);
    document.getElementById('stat-total').innerText = (ke + pe).toFixed(0);

    // Save history data
    if (this.isPlaying) {
      this.telemetryHistory.push({ ke: scalarKE, pe: scalarPE, total: scalarTotal });
      if (this.telemetryHistory.length > this.maxTelemetryPoints) {
        this.telemetryHistory.shift();
      }
    }

    // --- DRAW LIVE TELEMETRY GRAPH ---
    const tCtx = this.telCtx;
    const w = this.telWidth;
    const h = this.telHeight;

    tCtx.fillStyle = '#0d111b';
    tCtx.fillRect(0, 0, w, h);

    // Center baseline
    tCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    tCtx.beginPath();
    tCtx.moveTo(0, h/2);
    tCtx.lineTo(w, h/2);
    tCtx.stroke();

    if (this.telemetryHistory.length < 2) return;

    // Draw graphs
    const drawLine = (prop, color, glowColor) => {
      tCtx.save();
      tCtx.strokeStyle = color;
      tCtx.lineWidth = prop === 'total' ? 2 : 1.2;
      tCtx.shadowBlur = prop === 'total' ? 6 : 0;
      tCtx.shadowColor = glowColor;
      
      tCtx.beginPath();
      
      const stepX = w / (this.maxTelemetryPoints - 1);
      
      for (let i = 0; i < this.telemetryHistory.length; i++) {
        const x = i * stepX;
        // Normalize energy values to fit screen heights comfortably
        const energyVal = this.telemetryHistory[i][prop];
        const y = h/2 - Math.max(-h/2.2, Math.min(h/2.2, energyVal * 0.08));

        if (i === 0) tCtx.moveTo(x, y);
        else tCtx.lineTo(x, y);
      }
      tCtx.stroke();
      tCtx.restore();
    };

    drawLine('pe', '#06b6d4', 'rgba(6, 182, 212, 0.4)');   // Cyan PE
    drawLine('ke', '#ec4899', 'rgba(236, 72, 153, 0.4)');   // Pink KE
    drawLine('total', '#a855f7', 'rgba(168, 85, 247, 0.5)'); // Purple Total
  }

  // --- ENGINE RUN TICK ---
  loop() {
    this.updatePhysics();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// Instantiate physics dashboard on page loads
window.addEventListener('DOMContentLoaded', () => {
  window.AetherLab = new PhysicsLaboratory();
});
