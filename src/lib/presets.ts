import type { CursorProject } from './store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Preset {
  id: string;
  name: string;
  category: 'os' | 'minimal' | 'neon' | 'fun';
  description: string;
  hotspot: { x: number; y: number }; // at 32×32
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

const S = (v: number, size: number) => (v / 32) * size;

// Standard arrow path (tip at top-left). Outer = slightly expanded for borders.
function arrowOuter(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(S(0, size),    S(0, size));
  ctx.lineTo(S(0, size),    S(23, size));
  ctx.lineTo(S(5.5, size),  S(17, size));
  ctx.lineTo(S(10.5, size), S(28, size));
  ctx.lineTo(S(14.5, size), S(25.5, size));
  ctx.lineTo(S(9.5, size),  S(15, size));
  ctx.lineTo(S(17, size),   S(15, size));
  ctx.closePath();
}

function arrowInner(ctx: CanvasRenderingContext2D, size: number, inset = 2) {
  const i = inset;
  ctx.beginPath();
  ctx.moveTo(S(0 + i,      size), S(0 + i * 1.5, size));
  ctx.lineTo(S(0 + i,      size), S(23 - i,       size));
  ctx.lineTo(S(5.5,        size), S(17 - i * 0.5, size));
  ctx.lineTo(S(10.5,       size), S(28 - i,       size));
  ctx.lineTo(S(14.5 - i,   size), S(25.5 - i * 0.5, size));
  ctx.lineTo(S(9.5,        size), S(15 + i * 0.5, size));
  ctx.lineTo(S(17 - i,     size), S(15 + i * 0.5, size));
  ctx.closePath();
}

// Hand/pointer path
function handPath(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 32;
  // Index finger pointing up
  ctx.beginPath();
  // Finger tip
  ctx.moveTo(10 * s, 2 * s);
  ctx.bezierCurveTo(8 * s, 2 * s, 7 * s, 4 * s, 7 * s, 6 * s);
  ctx.lineTo(7 * s, 16 * s);
  // Knuckle join for middle finger
  ctx.bezierCurveTo(5 * s, 14 * s, 4 * s, 15 * s, 4 * s, 17 * s);
  ctx.lineTo(4 * s, 19 * s);
  ctx.bezierCurveTo(4 * s, 20 * s, 5 * s, 21 * s, 6 * s, 21 * s);
  // Palm
  ctx.lineTo(6 * s, 22 * s);
  ctx.lineTo(18 * s, 22 * s);
  ctx.lineTo(18 * s, 21 * s);
  ctx.bezierCurveTo(20 * s, 21 * s, 21 * s, 20 * s, 21 * s, 18 * s);
  ctx.lineTo(21 * s, 15 * s);
  ctx.bezierCurveTo(21 * s, 14 * s, 20 * s, 13 * s, 19 * s, 13 * s);
  ctx.lineTo(19 * s, 11 * s);
  ctx.bezierCurveTo(19 * s, 10 * s, 18 * s, 9 * s, 17 * s, 9 * s);
  ctx.lineTo(17 * s, 8 * s);
  ctx.bezierCurveTo(17 * s, 7 * s, 16 * s, 6 * s, 15 * s, 6 * s);
  ctx.lineTo(15 * s, 6 * s);
  ctx.bezierCurveTo(15 * s, 4 * s, 14 * s, 2 * s, 12 * s, 2 * s);
  ctx.closePath();
}

// ─── Preset definitions ───────────────────────────────────────────────────────

export const PRESETS: Preset[] = [
  // ── OS ───────────────────────────────────────────────────────────────────────
  {
    id: 'windows-11',
    name: 'Windows 11',
    category: 'os',
    description: 'Modern white cursor with drop shadow',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      // Drop shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.30)';
      ctx.shadowBlur = S(5, size);
      ctx.shadowOffsetX = S(2, size);
      ctx.shadowOffsetY = S(2, size);
      arrowOuter(ctx, size);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();

      // Black border (stroke over outer path)
      arrowOuter(ctx, size);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = S(2, size);
      ctx.lineJoin = 'round';
      ctx.stroke();

      // White fill on top (covers inner half of stroke)
      arrowInner(ctx, size, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
  },

  {
    id: 'windows-95',
    name: 'Windows 95',
    category: 'os',
    description: 'Classic bold black & white cursor',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      arrowOuter(ctx, size);
      ctx.fillStyle = '#000';
      ctx.fill();

      arrowInner(ctx, size, 2.5);
      ctx.fillStyle = '#fff';
      ctx.fill();
    },
  },

  {
    id: 'macos',
    name: 'macOS',
    category: 'os',
    description: 'Black cursor with white outline',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      // White outer border
      arrowOuter(ctx, size);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = S(3, size);
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Black fill
      arrowOuter(ctx, size);
      ctx.fillStyle = '#111';
      ctx.fill();
    },
  },

  // ── Minimal ───────────────────────────────────────────────────────────────────
  {
    id: 'minimal-white',
    name: 'Minimal White',
    category: 'minimal',
    description: 'Thin white arrow with hairline border',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      arrowOuter(ctx, size);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = S(1.5, size);
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#f8f8f8';
      ctx.fill();
      ctx.stroke();
    },
  },

  {
    id: 'minimal-black',
    name: 'Minimal Black',
    category: 'minimal',
    description: 'Thin black arrow with hairline border',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      arrowOuter(ctx, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = S(1.5, size);
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
      ctx.stroke();
    },
  },

  {
    id: 'minimal-glass',
    name: 'Glass',
    category: 'minimal',
    description: 'Frosted glass / translucent look',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      arrowOuter(ctx, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = S(1.5, size);
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.stroke();

      // Highlight streak
      arrowInner(ctx, size, 4);
      const grad = ctx.createLinearGradient(0, 0, S(10, size), S(10, size));
      grad.addColorStop(0, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fill();
    },
  },

  // ── Neon ─────────────────────────────────────────────────────────────────────
  {
    id: 'neon-violet',
    name: 'Neon Violet',
    category: 'neon',
    description: 'Glowing purple cursor',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      // Glow halo
      ctx.save();
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = S(8, size);
      arrowOuter(ctx, size);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      ctx.restore();

      // Bright inner
      arrowInner(ctx, size, 2);
      ctx.fillStyle = '#c084fc';
      ctx.fill();

      // Highlight
      arrowInner(ctx, size, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    },
  },

  {
    id: 'neon-cyan',
    name: 'Neon Cyan',
    category: 'neon',
    description: 'Glowing cyan cursor',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = S(8, size);
      arrowOuter(ctx, size);
      ctx.fillStyle = '#0891b2';
      ctx.fill();
      ctx.restore();

      arrowInner(ctx, size, 2);
      ctx.fillStyle = '#67e8f9';
      ctx.fill();

      arrowInner(ctx, size, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    },
  },

  {
    id: 'neon-red',
    name: 'Neon Red',
    category: 'neon',
    description: 'Glowing red cursor',
    hotspot: { x: 1, y: 1 },
    draw(ctx, size) {
      ctx.save();
      ctx.shadowColor = '#f87171';
      ctx.shadowBlur = S(8, size);
      arrowOuter(ctx, size);
      ctx.fillStyle = '#b91c1c';
      ctx.fill();
      ctx.restore();

      arrowInner(ctx, size, 2);
      ctx.fillStyle = '#fca5a5';
      ctx.fill();

      arrowInner(ctx, size, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    },
  },

  // ── Fun ───────────────────────────────────────────────────────────────────────
  {
    id: 'pixel',
    name: 'Pixel / 8-bit',
    category: 'fun',
    description: 'Retro pixelated cursor',
    hotspot: { x: 0, y: 0 },
    draw(ctx, size) {
      // Draw at 16×16 then scale up for that chunky pixel look
      const bitmap = [
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0],
        [1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0],
        [1,2,2,2,2,2,1,1,0,0,0,0,0,0,0,0],
        [1,2,2,1,2,2,1,0,0,0,0,0,0,0,0,0],
        [1,2,1,0,1,2,2,1,0,0,0,0,0,0,0,0],
        [1,1,0,0,0,1,2,1,0,0,0,0,0,0,0,0],
        [1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      ];
      const px = size / 16;
      ctx.imageSmoothingEnabled = false;
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          const v = bitmap[r][c];
          if (v === 0) continue;
          ctx.fillStyle = v === 1 ? '#000' : '#fff';
          ctx.fillRect(c * px, r * px, px, px);
        }
      }
    },
  },

  {
    id: 'hand',
    name: 'Hand / Pointer',
    category: 'fun',
    description: 'Pointing finger for links',
    hotspot: { x: 10, y: 2 },
    draw(ctx, size) {
      handPath(ctx, size);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = S(2, size);
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
    },
  },

  {
    id: 'crosshair',
    name: 'Crosshair',
    category: 'fun',
    description: 'Precision targeting crosshair',
    hotspot: { x: 16, y: 16 },
    draw(ctx, size) {
      const cx = size / 2;
      const gap = S(4, size);
      const r = S(6, size);
      const lw = S(2, size);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw + S(2, size);
      ctx.lineCap = 'round';

      const draw = () => {
        ctx.beginPath(); ctx.moveTo(cx, 0);        ctx.lineTo(cx, cx - gap); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cx + gap); ctx.lineTo(cx, size);     ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cx);        ctx.lineTo(cx - gap, cx); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + gap, cx); ctx.lineTo(size, cx);     ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke();
      };

      draw();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = lw;
      draw();
    },
  },

  {
    id: 'dot',
    name: 'Dot',
    category: 'fun',
    description: 'Simple filled circle',
    hotspot: { x: 8, y: 8 },
    draw(ctx, size) {
      const r = S(7, size);
      const cx = S(8, size), cy = S(8, size);

      // Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = S(4, size);
      ctx.shadowOffsetY = S(2, size);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();

      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#333'; ctx.lineWidth = S(1.5, size); ctx.stroke();

      // Inner highlight
      ctx.beginPath(); ctx.arc(cx - S(2, size), cy - S(2, size), S(2.5, size), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    },
  },

  {
    id: 'sword',
    name: 'Sword',
    category: 'fun',
    description: 'Gaming / RPG diagonal blade',
    hotspot: { x: 2, y: 2 },
    draw(ctx, size) {
      const s = size / 32;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-size / 2, -size / 2);

      // Blade
      ctx.beginPath();
      ctx.moveTo(16 * s, 2 * s);
      ctx.lineTo(18 * s, 4 * s);
      ctx.lineTo(10 * s, 22 * s);
      ctx.lineTo(8 * s,  20 * s);
      ctx.closePath();
      ctx.fillStyle = '#d4d4d4';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = S(1, size);
      ctx.fill(); ctx.stroke();

      // Blade edge highlight
      ctx.beginPath();
      ctx.moveTo(16.5 * s, 2.5 * s);
      ctx.lineTo(9 * s, 20.5 * s);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = S(0.8, size);
      ctx.stroke();

      // Guard
      ctx.beginPath();
      ctx.moveTo(7 * s,  19 * s);
      ctx.lineTo(12 * s, 24 * s);
      ctx.lineTo(13 * s, 23 * s);
      ctx.lineTo(8 * s,  18 * s);
      ctx.closePath();
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = S(0.8, size);
      ctx.fill(); ctx.stroke();

      // Handle
      ctx.beginPath();
      ctx.moveTo(9 * s,  22 * s);
      ctx.lineTo(11 * s, 24 * s);
      ctx.lineTo(6 * s,  29 * s);
      ctx.lineTo(4 * s,  27 * s);
      ctx.closePath();
      ctx.fillStyle = '#92400e';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = S(0.8, size);
      ctx.fill(); ctx.stroke();

      // Pommel
      ctx.beginPath();
      ctx.arc(4.5 * s, 27.5 * s, 2 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = S(0.8, size);
      ctx.fill(); ctx.stroke();

      ctx.restore();
    },
  },

  {
    id: 'star',
    name: 'Star',
    category: 'fun',
    description: 'Five-point star cursor',
    hotspot: { x: 14, y: 14 },
    draw(ctx, size) {
      const cx = size / 2, cy = size / 2;
      const outer = S(13, size), inner = S(5.5, size);

      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();

      ctx.save();
      ctx.shadowColor = 'rgba(250,204,21,0.5)';
      ctx.shadowBlur = S(6, size);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = S(1.5, size);
      ctx.lineJoin = 'round';
      ctx.stroke();
    },
  },
];

// ─── Client-side generation ───────────────────────────────────────────────────

const SIZES = [16, 24, 32, 48, 64, 128, 256];

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function generatePresetProject(preset: Preset): Promise<CursorProject> {
  const sizes = SIZES.map((size) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    preset.draw(ctx, size);
    const data = canvas.toDataURL('image/png').split(',')[1];
    return { size, data };
  });

  const preview32 = sizes.find((s) => s.size === 32)!;

  // Scale hotspot from 32px to actual sizes — store at 32px baseline
  const hotspot = { ...preset.hotspot };

  return {
    id: generateId(),
    name: preset.name,
    originalDataUrl: `data:image/png;base64,${preview32.data}`,
    sizes,
    hotspot,
    frameCount: 1,
    frames: [],
    frameDuration: 100,
    isAnimated: false,
    createdAt: Date.now(),
    tint: null,
    scale: 1,
  };
}
