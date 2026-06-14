// State variables
let dodgeCount = 0;
let isSuccess = false;
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

// Trigger state change and dodge sound
function triggerDodge() {
  const now = Date.now();
  if (now - lastDodgeTime > 250) {
    lastDodgeTime = now;
    playDodgeSound();

    dodgeCount++;
    const stage = stages[Math.min(dodgeCount - 1, stages.length - 1)];

    emojiDisplay.textContent = stage.emoji;
    subtitleDisplay.textContent = stage.subtitle;
    yesBtn.textContent = stage.yesText;

    // Yes button grows slightly; No button stays same size (no shrink)
    const yesScale = Math.min(1 + dodgeCount * 0.08, 1.5);
    yesBtn.style.transform = `scale(${yesScale})`;
  }
}

// Get accurate visible viewport dimensions (works correctly on mobile)
function getViewport() {
  const vvp = window.visualViewport;
  return {
    w:    vvp ? vvp.width      : window.innerWidth,
    h:    vvp ? vvp.height     : window.innerHeight,
    offX: vvp ? vvp.offsetLeft : 0,
    offY: vvp ? vvp.offsetTop  : 0
  };
}

// Place the No button at a safe position within the viewport,
// avoiding the central card if possible.
function placeNoButton(initial = false) {
  const { w, h, offX, offY } = getViewport();
  const btnW = noBtn.offsetWidth  || 76;
  const btnH = noBtn.offsetHeight || 40;
  const pad  = 20;

  const minX = offX + pad;
  const maxX = offX + w - btnW - pad;
  const minY = offY + pad;
  const maxY = offY + h - btnH - pad;

  // On initial placement, put the button just below the card (centred)
  if (initial) {
    const card = document.getElementById('question-card');
    const cr   = card ? card.getBoundingClientRect() : null;
    const initX = Math.max(minX, Math.min((w - btnW) / 2 + offX, maxX));
    const initY = cr
      ? Math.max(minY, Math.min(cr.bottom + 18, maxY))
      : maxY - 10;
    noBtn.style.left = `${initX}px`;
    noBtn.style.top  = `${initY}px`;
    return;
  }

  // For teleport: try up to 30 positions that avoid the card
  const card     = document.getElementById('question-card');
  const cardRect = card ? card.getBoundingClientRect() : null;
  let targetX, targetY, attempts = 0;

  do {
    targetX = minX + Math.random() * (maxX - minX);
    targetY = minY + Math.random() * (maxY - minY);
    attempts++;

    if (!cardRect || attempts >= 30) break;

    const buf      = 10;
    const overlapX = targetX < cardRect.right  + buf && targetX + btnW > cardRect.left - buf;
    const overlapY = targetY < cardRect.bottom + buf && targetY + btnH > cardRect.top  - buf;
    if (!overlapX || !overlapY) break; // safe spot found

  } while (true);

  // Hard-clamp — mathematically impossible to exceed bounds
  targetX = Math.max(minX, Math.min(targetX, maxX));
  targetY = Math.max(minY, Math.min(targetY, maxY));

  noBtn.style.left = `${targetX}px`;
  noBtn.style.top  = `${targetY}px`;
}

// Teleport No button on click / tap
function teleportNoButton(e) {
  if (isSuccess) return;
  if (e) e.preventDefault();
  placeNoButton(false);
  triggerDodge();
}

noBtn.addEventListener('click',      teleportNoButton);
noBtn.addEventListener('touchstart', teleportNoButton, { passive: false });

// Re-clamp the No button whenever the viewport resizes / orientation changes
function onViewportChange() {
  if (!isSuccess) placeNoButton(false);
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onViewportChange);
} else {
  window.addEventListener('resize', onViewportChange);
}

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

// Initialise: position No button below the card and reveal it
document.addEventListener('DOMContentLoaded', () => {
  // Small delay so layout is fully painted and getBoundingClientRect is accurate
  requestAnimationFrame(() => {
    placeNoButton(true);       // set safe initial position
    noBtn.classList.add('ready'); // make visible now that it's in the right spot
  });
});
