// State variables
let dodgeCount = 0;
let isSuccess = false;
let isFixed = false;
let lastDodgeTime = 0;
let audioCtx = null;

// DOM elements
const noBtn = document.getElementById('no-btn');
const yesBtn = document.getElementById('yes-btn');
const questionCard = document.getElementById('question-card');
const successCard = document.getElementById('success-card');
const emojiDisplay = document.getElementById('emoji-display');
const mainTitle = document.getElementById('main-title');
const subtitleDisplay = document.getElementById('subtitle-display');
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

// Phrases and emojis progression
const stages = [
  {
    emoji: '😸',
    subtitle: 'Come on, you know you want to! 💝',
    yesText: 'Come on now'
  },
  {
    emoji: '😹',
    subtitle: 'The button is faster than you 😹',
    yesText: 'WHY?'
  },
  {
    emoji: '😜',
    subtitle: 'Are you trying to say no? No way! 💖',
    yesText: 'Just click Yes! 😘'
  },
  {
    emoji: '🥺',
    subtitle: 'Pretty please? My heart is breaking... 💔',
    yesText: 'Yes, I will! 💖'
  },
  {
    emoji: '🥰',
    subtitle: 'You have no choice but to say yes! 😉',
    yesText: 'Okay, Yes! 💖'
  }
];

// Web Audio API Synthesizer
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playDodgeSound() {
  try {
    const context = getAudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'triangle';
    // Frequency sweep from 180Hz up to 550Hz for a cute "boing" jump sound
    osc.frequency.setValueAtTime(180, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(550, context.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.12);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 0.13);
  } catch (err) {
    console.warn("Audio playback failed or blocked:", err);
  }
}

function playSuccessSound() {
  try {
    const context = getAudioContext();
    const notes = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.50, d: 0.25 } // C6
    ];
    
    let time = context.currentTime;
    notes.forEach((note, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, time);
      
      // Add a slight vibrato to the last note to make it feel extra bright and magical
      if (index === notes.length - 1) {
        const vibrato = context.createOscillator();
        const vibratoGain = context.createGain();
        vibrato.frequency.value = 12; // 12Hz vibrato
        vibratoGain.gain.value = 12; // pitch swing
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibrato.start(time);
        vibrato.stop(time + note.d);
      }
      
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + note.d);
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      osc.start(time);
      osc.stop(time + note.d + 0.05);
      
      time += 0.07; // delay between notes
    });
  } catch (err) {
    console.warn("Audio playback failed or blocked:", err);
  }
}

// Natural (pre-scale) button dimensions — captured once before reparenting
let noBtnW = 0;
let noBtnH = 0;

// Convert "No" button positioning from relative to fixed without jumping layout
function ensureFixedPosition() {
  if (isFixed) return;

  // *** Read dimensions and position BEFORE reparenting ***
  // While still inside the card, getBoundingClientRect() is affected by the
  // card's backdrop-filter containing block — so we must correct for the
  // card's own offset to get true viewport coordinates.
  const cardEl = document.getElementById('question-card');
  const cardOffset = cardEl ? cardEl.getBoundingClientRect() : { left: 0, top: 0 };
  const btnRect = noBtn.getBoundingClientRect();

  // offsetWidth/Height give unscaled layout size — valid while still in the DOM tree
  noBtnW = noBtn.offsetWidth  || 80;
  noBtnH = noBtn.offsetHeight || 44;

  // Compute true viewport position:
  // If the card has backdrop-filter, fixed children are positioned relative to the card.
  // btnRect already accounts for this (it reports viewport-relative coords), so use it directly.
  const trueLeft = btnRect.left;
  const trueTop  = btnRect.top;

  // Detach from card so future fixed positioning is relative to the real viewport
  document.body.appendChild(noBtn);

  // Pin explicit size so offsetWidth never returns 0 after reparenting
  noBtn.style.width  = `${noBtnW}px`;
  noBtn.style.height = `${noBtnH}px`;

  noBtn.style.position = 'fixed';
  noBtn.style.zIndex   = '9999';
  noBtn.style.margin   = '0';
  noBtn.style.left     = `${trueLeft}px`;
  noBtn.style.top      = `${trueTop}px`;

  isFixed = true;
}

// Trigger state change and dodge sound
function triggerDodge() {
  const now = Date.now();
  if (now - lastDodgeTime > 250) { // Limit trigger frequency
    lastDodgeTime = now;
    playDodgeSound();
    
    dodgeCount++;
    const stage = stages[Math.min(dodgeCount - 1, stages.length - 1)];
    
    // Update contents
    emojiDisplay.textContent = stage.emoji;
    subtitleDisplay.textContent = stage.subtitle;
    yesBtn.textContent = stage.yesText;
    
    // Scale buttons: "Yes" grows, "No" shrinks
    const yesScale = 1 + (dodgeCount * 0.1);
    const noScale = Math.max(0.5, 1 - (dodgeCount * 0.08));
    
    yesBtn.style.transform = `scale(${yesScale})`;
    noBtn.style.transform = `scale(${noScale})`;
  }
}

// Teleport the No button on click/tap
function teleportNoButton(e) {
  if (isSuccess) return;
  if (e) e.preventDefault(); // Stop native click/tap actions

  ensureFixedPosition();

  // --- Accurate viewport size on mobile ---
  // visualViewport accounts for the browser chrome (address bar, keyboard, etc.)
  // Falls back to window.inner* on older browsers
  const vvp = window.visualViewport;
  const vw = vvp ? vvp.width  : window.innerWidth;
  const vh = vvp ? vvp.height : window.innerHeight;
  const vpOffX = vvp ? vvp.offsetLeft : 0;
  const vpOffY = vvp ? vvp.offsetTop  : 0;

  // --- Use pinned dimensions (safe after reparenting) ---
  const btnW = noBtnW || 80;
  const btnH = noBtnH || 44;

  const pad = 24; // min gap from every screen edge

  // Safe bounds — fully within visible viewport
  const minX = vpOffX + pad;
  const maxX = vpOffX + vw - btnW - pad;
  const minY = vpOffY + pad;
  const maxY = vpOffY + vh - btnH - pad;

  // Get the card rect so we can try to avoid the central floating box
  const card = document.getElementById('question-card');
  const cardRect = card ? card.getBoundingClientRect() : null;

  let targetX, targetY;
  let attempts = 0;

  do {
    targetX = minX + Math.random() * (maxX - minX);
    targetY = minY + Math.random() * (maxY - minY);
    attempts++;

    // After 25 tries just use the position (edge-case: very small screen)
    if (!cardRect || attempts >= 25) break;

    // Reject positions that land on the card (+ 12px breathing room)
    const buf = 12;
    const overlapX = targetX < cardRect.right  + buf && targetX + btnW > cardRect.left - buf;
    const overlapY = targetY < cardRect.bottom + buf && targetY + btnH > cardRect.top  - buf;

    if (!overlapX || !overlapY) break; // safe position found

  } while (true);

  // Hard-clamp as a final safety net — can never exceed safe zone
  targetX = Math.max(minX, Math.min(targetX, maxX));
  targetY = Math.max(minY, Math.min(targetY, maxY));

  noBtn.style.left = `${targetX}px`;
  noBtn.style.top  = `${targetY}px`;

  triggerDodge();
}

// Add event listeners for click and touchstart
noBtn.addEventListener('click', teleportNoButton);
noBtn.addEventListener('touchstart', (e) => {
  teleportNoButton(e);
});

// Canvas Particles Loop
let particles = [];
let animId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class Particle {
  constructor(isInitial = false) {
    this.x = Math.random() * canvas.width;
    this.y = isInitial ? Math.random() * canvas.height : -30;
    this.size = Math.random() * 14 + 10;
    
    // Speeds and floaty drift
    this.vx = Math.random() * 3 - 1.5;
    this.vy = Math.random() * 2 + 1.2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    
    const types = ['heart', 'star', 'petal'];
    this.type = types[Math.floor(Math.random() * types.length)];
    
    // Vibrant colors matching the pink/gold/magenta theme
    if (this.type === 'heart') {
      const colors = ['#FF2A6D', '#FF5E7E', '#FF85A0', '#FF0055'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    } else if (this.type === 'star') {
      this.color = '#FFD700'; // Gold
    } else {
      // Petals
      const colors = ['#FF4081', '#F50057', '#FF80AB', '#FF8A80'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
  }
  
  update() {
    this.y += this.vy;
    this.x += this.vx;
    this.rotation += this.rotationSpeed;
    
    // Soft wind swaying motion
    this.vx += Math.sin(this.y / 25) * 0.015;
  }
  
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    
    if (this.type === 'heart') {
      ctx.beginPath();
      ctx.moveTo(0, -this.size / 4);
      ctx.bezierCurveTo(-this.size / 2, -this.size, -this.size, -this.size / 3, 0, this.size);
      ctx.bezierCurveTo(this.size, -this.size / 3, this.size / 2, -this.size, 0, -this.size / 4);
      ctx.fill();
    } else if (this.type === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                   -Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
                   -Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'petal') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function startCelebration() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Populate initial screenspace with falling elements
  for (let i = 0; i < 70; i++) {
    particles.push(new Particle(true));
  }
  
  function updateLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach((p, index) => {
      p.update();
      p.draw();
      
      // Recycle particle when it exits screen bottom
      if (p.y > canvas.height + 30) {
        particles[index] = new Particle(false);
      }
    });
    
    // Continual particle check
    if (particles.length < 130) {
      particles.push(new Particle(false));
    }
    
    animId = requestAnimationFrame(updateLoop);
  }
  
  updateLoop();
}

// Success button click transition
yesBtn.addEventListener('click', () => {
  if (isSuccess) return;
  isSuccess = true;
  
  // Play chime sequence
  playSuccessSound();
  
  // Body success themes
  document.body.classList.add('success-state');
  
  // Flip active cards
  questionCard.classList.add('hidden');
  successCard.classList.add('show');
  
  // Begin particle storm
  startCelebration();
});
