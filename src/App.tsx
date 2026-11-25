import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundManager } from './utils/sound';

// Types
interface Vector2 {
  x: number;
  y: number;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  stripe: boolean;
  pocketed: boolean;
  spinX: number;
  spinY: number;
  rotation: number;
  angularVelocity: number;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

interface AnimationEvent {
  type: 'pocket' | 'combo';
  x: number;
  y: number;
  life: number;
  maxLife: number;
  text?: string;
  color: string;
  scale?: number;
}

const COLORS: { [key: number]: string } = {
  0: '#ffffff',
  1: '#ffd700',
  2: '#1e3a8a',
  3: '#dc2626',
  4: '#7c3aed',
  5: '#ea580c',
  6: '#16a34a',
  7: '#7f1d1d',
  8: '#1a1a1a',
  9: '#ffd700',
  10: '#1e3a8a',
  11: '#dc2626',
  12: '#7c3aed',
  13: '#ea580c',
  14: '#16a34a',
  15: '#7f1d1d',
};

const BALL_NAMES: { [key: number]: string } = {
  0: 'Blanche',
  1: 'Jaune', 2: 'Bleue', 3: 'Rouge', 4: 'Violette',
  5: 'Orange', 6: 'Verte', 7: 'Marron', 8: 'Noire',
  9: 'Jaune ⑨', 10: 'Bleue ⑩', 11: 'Rouge ⑪', 12: 'Violette ⑫',
  13: 'Orange ⑬', 14: 'Verte ⑭', 15: 'Marron ⑮',
};

const BALL_RADIUS = 13;
const FRICTION = 0.986;
const CUSHION_BOUNCE = 0.78;
const MIN_VELOCITY = 0.08;
const TABLE_PADDING = 44;
const POCKET_RADIUS = 23;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'aiming' | 'power' | 'spinning' | 'simulating' | 'gameover'>('aiming');
  const [power, setPower] = useState(50);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [mousePos, setMousePos] = useState<Vector2>({ x: 0, y: 0 });
  const [spinPos, setSpinPos] = useState<Vector2>({ x: 0, y: 0 });
  const [tableSize, setTableSize] = useState({ width: 880, height: 440 });
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [message, setMessage] = useState<string>('');
  const [messageTimeout, setMessageTimeout] = useState<number | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const animationRef = useRef<number | null>(null);
  const ballsRef = useRef<Ball[]>(balls);
  const tableSizeRef = useRef(tableSize);
  const particlesRef = useRef<Particle[]>([]);
  const trailsRef = useRef<Map<number, TrailPoint[]>>(new Map());
  const animationsRef = useRef<AnimationEvent[]>([]);
  const gameStateRef = useRef(gameState);
  const mousePosRef = useRef(mousePos);
  const powerRef = useRef(power);
  const spinPosRef = useRef(spinPos);
  const lastCollisionTimeRef = useRef<Map<string, number>>(new Map());

  // Keep refs updated
  useEffect(() => { ballsRef.current = balls; }, [balls]);
  useEffect(() => { tableSizeRef.current = tableSize; }, [tableSize]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  useEffect(() => { powerRef.current = power; }, [power]);
  useEffect(() => { spinPosRef.current = spinPos; }, [spinPos]);

  const showMessage = (msg: string, duration: number = 2000) => {
    setMessage(msg);
    if (messageTimeout) clearTimeout(messageTimeout);
    const t = window.setTimeout(() => setMessage(''), duration);
    setMessageTimeout(t);
  };

  // Initialize audio on first interaction
  const initAudio = () => {
    if (!audioInitialized) {
      soundManager.init();
      soundManager.startBackgroundMusic();
      setAudioInitialized(true);
    }
  };

  // Initialize table
  const initializeBalls = useCallback(() => {
    const ballRadius = BALL_RADIUS;
    const currentTableSize = tableSizeRef.current;
    const startX = currentTableSize.width * 0.73;
    const startY = currentTableSize.height / 2;
    const spacing = ballRadius * 2.15;

    const newBalls: Ball[] = [];

    // Cue ball
    newBalls.push({
      id: 0,
      x: currentTableSize.width * 0.27,
      y: startY,
      vx: 0, vy: 0,
      radius: ballRadius,
      color: COLORS[0],
      stripe: false,
      pocketed: false,
      spinX: 0, spinY: 0,
      rotation: 0,
      angularVelocity: 0,
    });

    // Rack formation (triangle) - 8-ball in the middle of 3rd row
    const rackOrder = [1, 11, 2, 3, 8, 10, 14, 4, 5, 13, 9, 6, 15, 12, 7];
    let ballIndex = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (ballIndex < rackOrder.length) {
          const id = rackOrder[ballIndex];
          newBalls.push({
            id,
            x: startX + row * spacing * 0.866,
            y: startY + (col - row / 2) * spacing,
            vx: 0, vy: 0,
            radius: ballRadius,
            color: COLORS[id],
            stripe: id > 8,
            pocketed: false,
            spinX: 0, spinY: 0,
            rotation: 0,
            angularVelocity: 0,
          });
          ballIndex++;
        }
      }
    }

    setBalls(newBalls);
    setSpinPos({ x: 0, y: 0 });
    setScore(0);
    setCombo(0);
    particlesRef.current = [];
    trailsRef.current.clear();
    animationsRef.current = [];
    setGameState('aiming');
  }, []);

  // Table de reference 960 x 480 : le canvas est mis a l'echelle en CSS et les
  // coordonnees du pointeur sont ramenees dans ce repere.
  useEffect(() => {
    setTableSize({ width: 960, height: 480 });
  }, []);

  // Initialize balls when table size changes
  useEffect(() => {
    if (tableSize.width > 0) {
      initializeBalls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSize.width]);

  // Get pockets
  const getPockets = useCallback((): Pocket[] => {
    const p = TABLE_PADDING;
    const w = tableSizeRef.current.width;
    const h = tableSizeRef.current.height;
    return [
      { x: p + 2, y: p + 2, radius: POCKET_RADIUS },
      { x: w / 2, y: p - 4, radius: POCKET_RADIUS - 3 },
      { x: w - p - 2, y: p + 2, radius: POCKET_RADIUS },
      { x: p + 2, y: h - p - 2, radius: POCKET_RADIUS },
      { x: w / 2, y: h - p + 4, radius: POCKET_RADIUS - 3 },
      { x: w - p - 2, y: h - p - 2, radius: POCKET_RADIUS },
    ];
  }, []);

  // Add particles at position
  const addParticles = (x: number, y: number, color: string, count: number = 8, speed: number = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const velocity = speed * (0.5 + Math.random() * 0.8);
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  };

  // Physics update
  const updatePhysics = useCallback((): boolean => {
    const currentBalls = ballsRef.current;
    const pockets = getPockets();
    let anyMoving = false;
    const now = performance.now();

    const newBalls: Ball[] = currentBalls.map(ball => {
      if (ball.pocketed) return ball;

      let { x, y, vx, vy, spinX, spinY, rotation, angularVelocity } = ball;

      // Apply velocity
      x += vx;
      y += vy;

      // Apply friction
      vx *= FRICTION;
      vy *= FRICTION;

      // Apply spin to trajectory (curve effect)
      vx += spinX * 0.03;
      vy += spinY * 0.03;

      // Apply spin decay
      spinX *= 0.97;
      spinY *= 0.97;

      // Update rotation based on velocity
      const speed = Math.sqrt(vx * vx + vy * vy);
      angularVelocity = speed * 0.1;
      rotation += angularVelocity;

      // Cushion collisions
      const left = TABLE_PADDING + ball.radius;
      const right = tableSizeRef.current.width - TABLE_PADDING - ball.radius;
      const top = TABLE_PADDING + ball.radius;
      const bottom = tableSizeRef.current.height - TABLE_PADDING - ball.radius;

      let cushionHit = false;
      let impactForce = 0;
      if (x < left) {
        x = left;
        impactForce = Math.abs(vx);
        vx = -vx * CUSHION_BOUNCE;
        vy += spinY * 0.4;
        spinX *= -0.5;
        cushionHit = true;
      }
      if (x > right) {
        x = right;
        impactForce = Math.max(impactForce, Math.abs(vx));
        vx = -vx * CUSHION_BOUNCE;
        vy -= spinY * 0.4;
        spinX *= -0.5;
        cushionHit = true;
      }
      if (y < top) {
        y = top;
        impactForce = Math.max(impactForce, Math.abs(vy));
        vy = -vy * CUSHION_BOUNCE;
        vx += spinX * 0.4;
        spinY *= -0.5;
        cushionHit = true;
      }
      if (y > bottom) {
        y = bottom;
        impactForce = Math.max(impactForce, Math.abs(vy));
        vy = -vy * CUSHION_BOUNCE;
        vx -= spinX * 0.4;
        spinY *= -0.5;
        cushionHit = true;
      }

      if (cushionHit && impactForce > 1) {
        soundManager.playCushionBounce(Math.min(1, impactForce / 10));
        addParticles(x, y, '#8b6f47', 4, impactForce * 0.3);
      }

      // Check pocket
      for (const pocket of pockets) {
        const dx = x - pocket.x;
        const dy = y - pocket.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pocket.radius - 4) {
          // Ball pocketed!
          soundManager.playPocketDrop();
          addParticles(pocket.x, pocket.y, ball.color, 15, 4);
          animationsRef.current.push({
            type: 'pocket',
            x: pocket.x,
            y: pocket.y,
            life: 1,
            maxLife: 1,
            color: ball.color,
            scale: 1,
          });

          // Update score
          if (ball.id === 0) {
            // Scratch - penalty
            setScore(prev => Math.max(0, prev - 50));
            setCombo(0);
            showMessage('Faute ! -50 points', 1500);
          } else {
            setCombo(prev => {
              const newCombo = prev + 1;
              const points = 100 * newCombo;
              setScore(s => s + points);
              soundManager.playSuccess();
              if (newCombo >= 3) {
                showMessage(`Combo x${newCombo} ! +${points}`, 1500);
              } else {
                showMessage(`${BALL_NAMES[ball.id] || 'Bille'} empochée ! +${points}`, 1500);
              }
              return newCombo;
            });
          }
          return { ...ball, x, y, vx: 0, vy: 0, pocketed: true, spinX: 0, spinY: 0, rotation, angularVelocity };
        }
      }

      // Check if still moving
      if (speed > MIN_VELOCITY) {
        anyMoving = true;
        // Add to trail
        if (!trailsRef.current.has(ball.id)) {
          trailsRef.current.set(ball.id, []);
        }
        const trail = trailsRef.current.get(ball.id)!;
        trail.push({ x, y, life: 1 });
        if (trail.length > 15) trail.shift();
      } else {
        vx = 0;
        vy = 0;
      }

      return { ...ball, x, y, vx, vy, spinX, spinY, rotation, angularVelocity };
    });

    // Ball-to-ball collisions
    for (let i = 0; i < newBalls.length; i++) {
      for (let j = i + 1; j < newBalls.length; j++) {
        const b1 = newBalls[i];
        const b2 = newBalls[j];
        if (b1.pocketed || b2.pocketed) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist && dist > 0) {
          // Cooldown to prevent multiple sounds
          const key = `${Math.min(b1.id, b2.id)}-${Math.max(b1.id, b2.id)}`;
          const lastHit = lastCollisionTimeRef.current.get(key) || 0;
          if (now - lastHit < 50) {
            // Still resolve but no sound
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            b1.x -= overlap * nx * 0.5;
            b1.y -= overlap * ny * 0.5;
            b2.x += overlap * nx * 0.5;
            b2.y += overlap * ny * 0.5;
            continue;
          }
          lastCollisionTimeRef.current.set(key, now);

          const nx = dx / dist;
          const ny = dy / dist;

          const dvx = b1.vx - b2.vx;
          const dvy = b1.vy - b2.vy;
          const dvn = dvx * nx + dvy * ny;

          if (dvn > 0) {
            const impactVelocity = Math.abs(dvn);
            const spinFactor1 = (b1.spinX * nx + b1.spinY * ny) * 0.15;
            const spinFactor2 = (b2.spinX * (-nx) + b2.spinY * (-ny)) * 0.15;

            b1.vx -= (dvn * nx) * 0.99 + spinFactor1;
            b1.vy -= (dvn * ny) * 0.99 + spinFactor1;
            b2.vx += (dvn * nx) * 0.99 + spinFactor2;
            b2.vy += (dvn * ny) * 0.99 + spinFactor2;

            const overlap = minDist - dist;
            b1.x -= overlap * nx * 0.5;
            b1.y -= overlap * ny * 0.5;
            b2.x += overlap * nx * 0.5;
            b2.y += overlap * ny * 0.5;

            if (impactVelocity > 0.5) {
              soundManager.playBallCollision(Math.min(1, impactVelocity / 15));
              const mx = (b1.x + b2.x) / 2;
              const my = (b1.y + b2.y) / 2;
              addParticles(mx, my, '#ffffff', 6, impactVelocity * 0.4);
            }

            anyMoving = true;
          }
        }
      }
    }

    setBalls(newBalls);

    // Update particles
    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vx: p.vx * 0.92,
        vy: p.vy * 0.92,
        life: p.life - 0.02,
      }))
      .filter(p => p.life > 0);

    // Update trails
    trailsRef.current.forEach((trail, id) => {
      const updated = trail.map(t => ({ ...t, life: t.life - 0.08 })).filter(t => t.life > 0);
      if (updated.length === 0) {
        trailsRef.current.delete(id);
      } else {
        trailsRef.current.set(id, updated);
      }
    });

    // Update animations
    animationsRef.current = animationsRef.current
      .map(a => ({ ...a, life: a.life - 0.015, scale: (a.scale || 1) * 0.98 }))
      .filter(a => a.life > 0);

    return anyMoving;
  }, [getPockets]);

  // Render loop - separate from physics for smoothness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let renderFrame: number;
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, tableSize.width, tableSize.height);

      // Draw table shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(8, 8, tableSize.width, tableSize.height);

      // Draw outer wood rail with gradient
      const woodGradient = ctx.createLinearGradient(0, 0, 0, tableSize.height);
      woodGradient.addColorStop(0, '#6b4423');
      woodGradient.addColorStop(0.3, '#8b5a2b');
      woodGradient.addColorStop(0.5, '#a0714a');
      woodGradient.addColorStop(0.7, '#8b5a2b');
      woodGradient.addColorStop(1, '#5c3d1f');
      ctx.fillStyle = woodGradient;
      ctx.fillRect(0, 0, tableSize.width, tableSize.height);

      // Wood grain texture
      ctx.strokeStyle = 'rgba(40, 20, 10, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const y = (i / 20) * tableSize.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
          tableSize.width / 3, y + Math.sin(i) * 3,
          (tableSize.width * 2) / 3, y - Math.sin(i) * 3,
          tableSize.width, y
        );
        ctx.stroke();
      }

      // Draw inner rail bevel (dark edge)
      ctx.fillStyle = '#3d2817';
      ctx.fillRect(TABLE_PADDING - 4, TABLE_PADDING - 4,
        tableSize.width - TABLE_PADDING * 2 + 8,
        tableSize.height - TABLE_PADDING * 2 + 8);

      // Draw cushion
      const cushionGradient = ctx.createLinearGradient(0, TABLE_PADDING - 10, 0, TABLE_PADDING + 5);
      cushionGradient.addColorStop(0, '#1f7a45');
      cushionGradient.addColorStop(0.5, '#2d9a5e');
      cushionGradient.addColorStop(1, '#1f7a45');
      ctx.fillStyle = cushionGradient;
      ctx.fillRect(TABLE_PADDING - 10, TABLE_PADDING - 10,
        tableSize.width - TABLE_PADDING * 2 + 20,
        tableSize.height - TABLE_PADDING * 2 + 20);

      // Draw felt (table surface) with gradient for lighting
      const feltGradient = ctx.createRadialGradient(
        tableSize.width / 2, tableSize.height / 2, 50,
        tableSize.width / 2, tableSize.height / 2, tableSize.width / 1.5
      );
      feltGradient.addColorStop(0, '#2a8a50');
      feltGradient.addColorStop(0.7, '#1a6b3c');
      feltGradient.addColorStop(1, '#0f4a2a');
      ctx.fillStyle = feltGradient;
      ctx.fillRect(TABLE_PADDING, TABLE_PADDING,
        tableSize.width - TABLE_PADDING * 2,
        tableSize.height - TABLE_PADDING * 2);

      // Felt subtle texture - static pattern
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      for (let i = 0; i < 200; i++) {
        // Use seeded random so it doesn't flicker
        const x = TABLE_PADDING + ((i * 137.5) % (tableSize.width - TABLE_PADDING * 2));
        const y = TABLE_PADDING + ((i * 241.3) % (tableSize.height - TABLE_PADDING * 2));
        ctx.fillRect(x, y, 1, 1);
      }

      // Draw pockets (with depth effect)
      const pockets = getPockets();
      pockets.forEach(pocket => {
        // Outer ring shadow
        const pocketGrad = ctx.createRadialGradient(
          pocket.x, pocket.y, pocket.radius * 0.6,
          pocket.x, pocket.y, pocket.radius * 1.2
        );
        pocketGrad.addColorStop(0, '#000000');
        pocketGrad.addColorStop(0.7, '#0a0a0a');
        pocketGrad.addColorStop(1, '#2a1a0a');
        ctx.fillStyle = pocketGrad;
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Inner hole
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw diamonds (sights) on rails
      ctx.fillStyle = '#f5e6d3';
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 1;
      const diamondSize = 3;
      const topY = TABLE_PADDING / 2;
      const bottomY = tableSize.height - TABLE_PADDING / 2;
      const leftX = TABLE_PADDING / 2;
      const rightX = tableSize.width - TABLE_PADDING / 2;

      for (let i = 1; i < 8; i++) {
        const x = TABLE_PADDING + (tableSize.width - TABLE_PADDING * 2) * i / 8;
        if (Math.abs(x - tableSize.width / 2) < POCKET_RADIUS + 5) continue;
        [topY, bottomY].forEach(y => {
          ctx.beginPath();
          ctx.moveTo(x, y - diamondSize);
          ctx.lineTo(x + diamondSize, y);
          ctx.lineTo(x, y + diamondSize);
          ctx.lineTo(x - diamondSize, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
      for (let i = 1; i < 4; i++) {
        const y = TABLE_PADDING + (tableSize.height - TABLE_PADDING * 2) * i / 4;
        [leftX, rightX].forEach(x => {
          ctx.beginPath();
          ctx.moveTo(x, y - diamondSize);
          ctx.lineTo(x + diamondSize, y);
          ctx.lineTo(x, y + diamondSize);
          ctx.lineTo(x - diamondSize, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }

      // Draw head string (line behind which cue ball is placed)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const headStringX = TABLE_PADDING + (tableSize.width - TABLE_PADDING * 2) * 0.27;
      ctx.moveTo(headStringX, TABLE_PADDING);
      ctx.lineTo(headStringX, tableSize.height - TABLE_PADDING);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw foot spot
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(tableSize.width * 0.73, tableSize.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw trails
      trailsRef.current.forEach((trail, id) => {
        if (trail.length < 2) return;
        const ball = ballsRef.current.find(b => b.id === id);
        if (!ball || ball.pocketed) return;
        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          ctx.strokeStyle = `rgba(255,255,255,${p2.life * 0.3})`;
          ctx.lineWidth = BALL_RADIUS * 1.5 * p2.life;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });

      // Draw aim line (dotted) when aiming
      const cueBall = ballsRef.current.find(b => b.id === 0 && !b.pocketed);
      if (cueBall && (gameStateRef.current === 'aiming' || gameStateRef.current === 'power')) {
        const dx = mousePosRef.current.x - cueBall.x;
        const dy = mousePosRef.current.y - cueBall.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Draw aim line
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(cueBall.x + nx * (cueBall.radius + 2), cueBall.y + ny * (cueBall.radius + 2));
          ctx.lineTo(cueBall.x + nx * 400, cueBall.y + ny * 400);
          ctx.stroke();
          ctx.setLineDash([]);

          // Predicted hit point on ball
          let hitBall: Ball | null = null;
          let minT = Infinity;
          for (const b of ballsRef.current) {
            if (b.id === 0 || b.pocketed) continue;
            // Line-circle intersection
            const ocx = cueBall.x - b.x;
            const ocy = cueBall.y - b.y;
            const a = nx * nx + ny * ny;
            const bv = 2 * (ocx * nx + ocy * ny);
            const c = ocx * ocx + ocy * ocy - (BALL_RADIUS * 2) * (BALL_RADIUS * 2);
            const discriminant = bv * bv - 4 * a * c;
            if (discriminant >= 0) {
              const t = (-bv - Math.sqrt(discriminant)) / (2 * a);
              if (t > 0 && t < minT) {
                minT = t;
                hitBall = b;
              }
            }
          }

          if (hitBall && minT < 500) {
            const hitX = cueBall.x + nx * minT;
            const hitY = cueBall.y + ny * minT;
            // Draw ghost cue ball at hit point
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hitX, hitY, BALL_RADIUS, 0, Math.PI * 2);
            ctx.stroke();

            // Draw predicted target ball direction
            const tbx = hitBall.x - hitX;
            const tby = hitBall.y - hitY;
            const tbdist = Math.sqrt(tbx * tbx + tby * tby);
            if (tbdist > 0) {
              ctx.strokeStyle = `rgba(255,200,100,0.5)`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(hitBall.x, hitBall.y);
              ctx.lineTo(hitBall.x + (tbx / tbdist) * 80, hitBall.y + (tby / tbdist) * 80);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }

      // Draw balls
      ballsRef.current.forEach(ball => {
        if (ball.pocketed) return;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(ball.x + 4, ball.y + 5, ball.radius * 0.95, ball.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.rotation);

        // Ball base with 3D gradient
        const gradient = ctx.createRadialGradient(
          -ball.radius * 0.35, -ball.radius * 0.35, ball.radius * 0.1,
          0, 0, ball.radius
        );
        if (ball.id === 0) {
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.5, '#f0f0f0');
          gradient.addColorStop(1, '#b0b0b0');
        } else {
          gradient.addColorStop(0, lightenColor(ball.color, 60));
          gradient.addColorStop(0.4, lightenColor(ball.color, 20));
          gradient.addColorStop(1, darkenColor(ball.color, 40));
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // Stripe
        if (ball.stripe) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, ball.radius * 0.95, ball.radius * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Number circle
        if (ball.id > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, ball.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = `bold ${ball.radius * 0.75}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.id.toString(), 0, 0);
        }

        ctx.restore();

        // Specular highlight (doesn't rotate with ball)
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(
          ball.x - ball.radius * 0.4,
          ball.y - ball.radius * 0.4,
          ball.radius * 0.3,
          ball.radius * 0.2,
          -Math.PI / 4,
          0, Math.PI * 2
        );
        ctx.fill();
      });

      // Draw particles
      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw pocket animations
      animationsRef.current.forEach(a => {
        if (a.type === 'pocket') {
          ctx.strokeStyle = a.color;
          ctx.lineWidth = 3 * a.life;
          ctx.globalAlpha = a.life;
          const radius = (1 - a.life) * 40 + POCKET_RADIUS;
          ctx.beginPath();
          ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

      // Draw spin indicator on cue ball
      if (cueBall && (gameStateRef.current === 'spinning' || (spinPosRef.current.x !== 0 || spinPosRef.current.y !== 0))) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cueBall.x, cueBall.y, cueBall.radius + 6, 0, Math.PI * 2);
        ctx.stroke();

        if (spinPosRef.current.x !== 0 || spinPosRef.current.y !== 0) {
          ctx.fillStyle = 'rgba(255,80,80,0.9)';
          ctx.beginPath();
          ctx.arc(
            cueBall.x + spinPosRef.current.x * cueBall.radius,
            cueBall.y + spinPosRef.current.y * cueBall.radius,
            4, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Draw cue stick
      if (cueBall && (gameStateRef.current === 'aiming' || gameStateRef.current === 'power')) {
        const dx = mousePosRef.current.x - cueBall.x;
        const dy = mousePosRef.current.y - cueBall.y;
        const angle = Math.atan2(dy, dx);
        const cueLength = 250;
        const cueOffset = cueBall.radius + 8 + (gameStateRef.current === 'power' ? powerRef.current * 0.6 : 0);

        const cueStartX = cueBall.x - Math.cos(angle) * cueOffset;
        const cueStartY = cueBall.y - Math.sin(angle) * cueOffset;
        const cueEndX = cueStartX - Math.cos(angle) * cueLength;
        const cueEndY = cueStartY - Math.sin(angle) * cueLength;

        // Cue shadow
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cueStartX + 4, cueStartY + 5);
        ctx.lineTo(cueEndX + 4, cueEndY + 5);
        ctx.stroke();

        // Cue body with gradient
        const cueGradient = ctx.createLinearGradient(cueStartX, cueStartY, cueEndX, cueEndY);
        cueGradient.addColorStop(0, '#fef3d9');
        cueGradient.addColorStop(0.05, '#d4a574');
        cueGradient.addColorStop(0.3, '#b8895a');
        cueGradient.addColorStop(0.7, '#6b4423');
        cueGradient.addColorStop(1, '#3d2817');

        ctx.strokeStyle = cueGradient;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(cueEndX, cueEndY);
        ctx.stroke();

        // Highlight line
        ctx.strokeStyle = 'rgba(255,240,200,0.3)';
        ctx.lineWidth = 2;
        const highlightOffsetX = Math.sin(angle) * 3;
        const highlightOffsetY = -Math.cos(angle) * 3;
        ctx.beginPath();
        ctx.moveTo(cueStartX + highlightOffsetX, cueStartY + highlightOffsetY);
        ctx.lineTo(cueEndX + highlightOffsetX, cueEndY + highlightOffsetY);
        ctx.stroke();

        // Ferrule (white ring)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cueStartX, cueStartY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Tip (blue chalk)
        ctx.fillStyle = '#4a7fc1';
        ctx.beginPath();
        ctx.arc(cueStartX + Math.cos(angle) * 3, cueStartY + Math.sin(angle) * 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      renderFrame = requestAnimationFrame(render);
    };

    renderFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(renderFrame);
  }, [tableSize, getPockets]);

  // Physics loop
  useEffect(() => {
    if (gameState === 'simulating') {
      let localFrame: number;
      const step = () => {
        const moving = updatePhysics();
        if (!moving) {
          // Check for scratch
          setBalls(prev => {
            const cueBall = prev.find(b => b.id === 0);
            if (cueBall?.pocketed) {
              return prev.map(b =>
                b.id === 0 ? {
                  ...b,
                  pocketed: false,
                  x: tableSizeRef.current.width * 0.27,
                  y: tableSizeRef.current.height / 2,
                  vx: 0, vy: 0,
                  rotation: 0,
                  angularVelocity: 0,
                } : b
              );
            }
            return prev;
          });

          // Check game over
          const remaining = ballsRef.current.filter(b => !b.pocketed && b.id !== 0);
          if (remaining.length === 0) {
            setGameState('gameover');
            showMessage('🎉 Bravo ! Table terminée ! 🎉', 5000);
            soundManager.playSuccess();
          } else {
            setGameState('aiming');
            setCombo(0);
          }
        } else {
          localFrame = requestAnimationFrame(step);
        }
      };
      localFrame = requestAnimationFrame(step);
      animationRef.current = localFrame;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, updatePhysics]);

  // Mouse handlers
  const pointerPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const position = pointerPosition(e);
    if (!position) return;

    const x = position.x;
    const y = position.y;
    setMousePos({ x, y });

    if (gameState === 'spinning') {
      const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
      if (cueBall) {
        const dx = x - cueBall.x;
        const dy = y - cueBall.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const clampedDist = Math.min(dist, cueBall.radius);
          setSpinPos({
            x: (dx / dist) * (clampedDist / cueBall.radius),
            y: (dy / dist) * (clampedDist / cueBall.radius)
          });
        }
      }
    }
  };

  const handleClick = () => {
    initAudio();
    if (gameState === 'aiming') {
      setGameState('power');
      showMessage('Ajustez la puissance puis cliquez', 1500);
    } else if (gameState === 'power') {
      setGameState('spinning');
      showMessage('Cliquez sur la bille blanche pour définir l\'effet', 2000);
    } else if (gameState === 'spinning') {
      const cueBall = balls.find(b => b.id === 0 && !b.pocketed);
      if (cueBall) {
        const dx = mousePos.x - cueBall.x;
        const dy = mousePos.y - cueBall.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const speed = power * 0.28;
          soundManager.playCueShot(power / 100);
          setBalls(prev => prev.map(b =>
            b.id === 0 ? {
              ...b,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              spinX: spinPos.x * 2.5,
              spinY: spinPos.y * 2.5
            } : b
          ));
          setSpinPos({ x: 0, y: 0 });
          setGameState('simulating');
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.code === 'Space' && (gameState === 'aiming' || gameState === 'power' || gameState === 'spinning')) {
      e.preventDefault();
      handleClick();
    }
  };

  // Helper functions
  function lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  function darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  const pocketedBalls = balls.filter(b => b.pocketed && b.id !== 0);
  const pocketedCount = pocketedBalls.length;

  const toggleMusic = () => {
    initAudio();
    const newValue = !musicOn;
    setMusicOn(newValue);
    soundManager.toggleMusic(newValue);
  };

  const toggleSfx = () => {
    initAudio();
    const newValue = !sfxOn;
    setSfxOn(newValue);
    soundManager.toggleSfx(newValue);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0a0a1a] flex flex-col items-center justify-center p-3 sm:p-4 select-none relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f4a261] opacity-5 blur-3xl rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#4a90d9] opacity-5 blur-3xl rounded-full"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 mb-3 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-[#f4a261] via-[#faf3e0] to-[#f4a261] bg-clip-text text-transparent font-serif tracking-wide drop-shadow-lg">
          🎱 Billard
        </h1>
        <p className="text-[#8888aa] text-sm mt-1 italic">Un jeu de Geoffroy</p>
      </div>

      {/* Message overlay */}
      {message && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 animate-pulse">
          <div className="px-6 py-3 bg-gradient-to-r from-[#f4a261] to-[#e8964f] text-[#1a1a2e] font-bold rounded-full shadow-2xl text-lg">
            {message}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="relative z-10 mb-3 flex gap-6 items-center">
        <div className="text-center text-[#f4a261] text-sm sm:text-lg font-medium px-3 sm:px-4 py-2 bg-[#2a2a4e]/80 rounded-lg backdrop-blur-sm border border-[#f4a261]/20">
          {gameState === 'aiming' && '🎯 Visez avec la souris'}
          {gameState === 'power' && '⚡ Ajustez la puissance'}
          {gameState === 'spinning' && '🔄 Définissez l\'effet'}
          {gameState === 'simulating' && '⏳ En cours...'}
          {gameState === 'gameover' && '🏆 Partie terminée !'}
        </div>
      </div>

      {/* Game container */}
      <div className="relative z-10 flex w-full max-w-[1180px] flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={tableSize.width}
          height={tableSize.height}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="w-full max-w-[960px] h-auto rounded-lg cursor-crosshair focus:outline-none touch-none"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 2px rgba(244,162,97,0.1)'
          }}
        />

        {/* Controls panel */}
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:w-40 lg:flex-col">
          {/* Score */}
          <div className="bg-gradient-to-br from-[#2a2a4e] to-[#1a1a3e] rounded-xl p-4 shadow-lg border border-[#f4a261]/20">
            <div className="text-[#faf3e0] text-xs mb-1 font-medium uppercase tracking-wider">Score</div>
            <div className="text-3xl font-bold text-[#f4a261] tabular-nums">{score}</div>
            {combo >= 2 && (
              <div className="text-sm text-[#ef4444] font-bold mt-1 animate-pulse">
                🔥 Combo x{combo}
              </div>
            )}
          </div>

          {/* Power slider */}
          <div className="bg-gradient-to-br from-[#2a2a4e] to-[#1a1a3e] rounded-xl p-4 shadow-lg border border-[#f4a261]/20">
            <div className="text-[#faf3e0] text-xs mb-2 font-medium uppercase tracking-wider">Puissance</div>
            <div className="flex gap-2 items-center">
              <div className="relative h-40 w-10 bg-[#1a1a2e] rounded-full overflow-hidden border border-[#f4a261]/10">
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-75"
                  style={{
                    height: `${power}%`,
                    background: power < 30
                      ? 'linear-gradient(to top, #22c55e, #4ade80)'
                      : power < 70
                      ? 'linear-gradient(to top, #22c55e, #eab308)'
                      : 'linear-gradient(to top, #22c55e, #eab308, #ef4444)'
                  }}
                />
                <div
                  className="absolute left-0 right-0 h-0.5 bg-white shadow-lg"
                  style={{ bottom: `${power}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={power}
                  onChange={(e) => { setPower(Number(e.target.value)); initAudio(); }}
                  onMouseDown={initAudio}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
              </div>
              <div className="flex-1">
                <div className="text-[#f4a261] text-2xl font-bold tabular-nums">{power}%</div>
                <div className="text-[#8888aa] text-xs mt-1">
                  {power < 30 ? 'Léger' : power < 70 ? 'Moyen' : 'Puissant'}
                </div>
              </div>
            </div>
          </div>

          {/* Spin indicator */}
          <div className="bg-gradient-to-br from-[#2a2a4e] to-[#1a1a3e] rounded-xl p-4 shadow-lg border border-[#f4a261]/20">
            <div className="text-[#faf3e0] text-xs mb-2 font-medium uppercase tracking-wider">Effet</div>
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#2a2a4e] to-[#1a1a2e] flex items-center justify-center border border-[#f4a261]/20 shadow-inner">
              <div
                className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg transition-transform"
                style={{
                  transform: `translate(${spinPos.x * 24}px, ${spinPos.y * 24}px)`
                }}
              />
            </div>
            <div className="text-[#8888aa] text-xs mt-2 text-center">
              {(spinPos.x === 0 && spinPos.y === 0) ? 'Centré' : 'Actif'}
            </div>
          </div>

          {/* Balls pocketed */}
          <div className="bg-gradient-to-br from-[#2a2a4e] to-[#1a1a3e] rounded-xl p-4 shadow-lg border border-[#f4a261]/20">
            <div className="text-[#faf3e0] text-xs mb-2 font-medium uppercase tracking-wider">Empochées</div>
            <div className="text-2xl font-bold text-[#f4a261] tabular-nums">{pocketedCount}/15</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {pocketedBalls.map(b => (
                <div
                  key={b.id}
                  className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                  style={{ backgroundColor: b.color }}
                  title={BALL_NAMES[b.id]}
                />
              ))}
            </div>
          </div>

          {/* Audio controls */}
          <div className="bg-gradient-to-br from-[#2a2a4e] to-[#1a1a3e] rounded-xl p-3 shadow-lg border border-[#f4a261]/20">
            <button
              onClick={toggleMusic}
              className="w-full text-xs py-1.5 rounded-lg bg-[#1a1a2e] text-[#faf3e0] hover:bg-[#2a2a4e] transition-colors flex items-center justify-center gap-1"
            >
              {musicOn ? '🎵 Musique' : '🔇 Musique'}
            </button>
            <button
              onClick={toggleSfx}
              className="w-full text-xs py-1.5 mt-2 rounded-lg bg-[#1a1a2e] text-[#faf3e0] hover:bg-[#2a2a4e] transition-colors flex items-center justify-center gap-1"
            >
              {sfxOn ? '🔊 Effets' : '🔇 Effets'}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="relative z-10 mt-4 sm:mt-5 mx-3 text-[#8888aa] text-xs text-center max-w-2xl bg-[#1a1a2e]/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-[#f4a261]/10">
        <p><strong className="text-[#faf3e0]">Comment jouer :</strong> Visez avec la souris → Cliquez pour valider → Ajustez la puissance → Définissez l'effet sur la bille blanche → Tirez ! (Espace = action rapide)</p>
      </div>

      {/* Reset button */}
      <button
        onClick={() => { initAudio(); initializeBalls(); }}
        className="relative z-10 mt-3 px-6 py-2 bg-gradient-to-r from-[#f4a261] to-[#e8964f] text-[#1a1a2e] font-bold rounded-lg 
                   hover:from-[#e8964f] hover:to-[#f4a261] transition-all shadow-lg hover:scale-105 active:scale-95"
      >
        🔄 Nouvelle Partie
      </button>

      {/* Footer */}
      <div className="relative z-10 mt-4 text-[#555577] text-xs">
        Créé avec ❤️ par Geoffroy • Billard Classique
      </div>
    </div>
  );
}

export default App;
