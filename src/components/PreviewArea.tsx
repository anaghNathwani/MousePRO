'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

type BgStyle = 'dark' | 'light' | 'code' | 'gradient' | 'desktop';

const BG_STYLES: { id: BgStyle; label: string; style: React.CSSProperties }[] = [
  {
    id: 'dark',
    label: 'Dark',
    style: { background: '#1a1a2e' },
  },
  {
    id: 'light',
    label: 'Light',
    style: { background: '#f8fafc' },
  },
  {
    id: 'code',
    label: 'Code',
    style: { background: '#0d1117' },
  },
  {
    id: 'gradient',
    label: 'Gradient',
    style: { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  },
  {
    id: 'desktop',
    label: 'macOS',
    style: { background: 'linear-gradient(160deg, #1c2f4a 0%, #2d4a6b 100%)' },
  },
];

interface Trail {
  id: number;
  x: number;
  y: number;
}

export default function PreviewArea() {
  const { projects, activeProjectId } = useStore();
  const project = projects.find((p) => p.id === activeProjectId) ?? null;
  const [bg, setBg] = useState<BgStyle>('dark');
  const [showTrail, setShowTrail] = useState(false);
  const [trail, setTrail] = useState<Trail[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const trailIdRef = useRef(0);
  const animFrameRef = useRef(0);
  const frameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animated cursor frame
  const [displayFrame, setDisplayFrame] = useState(0);
  useEffect(() => {
    if (!project?.isAnimated) { setDisplayFrame(0); return; }
    frameTimerRef.current = setInterval(() => {
      setDisplayFrame((f) => (f + 1) % project.frames.length);
    }, project.frameDuration);
    return () => { if (frameTimerRef.current) clearInterval(frameTimerRef.current); };
  }, [project]);

  const currentImageData = project?.isAnimated && project.frames[displayFrame]
    ? project.frames[displayFrame]
    : (project?.sizes.find((s) => s.size === 32)?.data ?? null);

  // Build CSS cursor string
  const cursorCSS = currentImageData
    ? `url('data:image/png;base64,${currentImageData}') ${project!.hotspot.x} ${project!.hotspot.y}, auto`
    : 'auto';

  // Handle trail
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPos({ x, y });

    if (showTrail) {
      const id = ++trailIdRef.current;
      setTrail((t) => [...t.slice(-18), { id, x, y }]);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 text-sm">
        Upload a cursor to preview it here
      </div>
    );
  }

  const bgConfig = BG_STYLES.find((b) => b.id === bg)!;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Live Preview</p>

        <div className="flex items-center gap-2">
          {/* Trail toggle */}
          <button
            onClick={() => setShowTrail((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
              showTrail
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
            Trail
          </button>

          {/* Background selector */}
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl px-1.5 py-1 border border-white/[0.06]">
            {BG_STYLES.map((b) => (
              <button
                key={b.id}
                onClick={() => setBg(b.id)}
                title={b.label}
                className={`relative px-2.5 py-0.5 rounded-lg text-[10px] transition-all duration-150 ${
                  bg === b.id ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-white/[0.08]">
        <div
          ref={previewRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsInside(true)}
          onMouseLeave={() => { setIsInside(false); setTrail([]); }}
          className="absolute inset-0"
          style={{
            ...bgConfig.style,
            cursor: cursorCSS,
          }}
        >
          {/* Fake UI content per background */}
          {bg === 'code' && <CodePreviewContent />}
          {bg === 'desktop' && <DesktopPreviewContent />}
          {bg === 'gradient' && <GradientPreviewContent />}
          {(bg === 'dark' || bg === 'light') && <GenericPreviewContent dark={bg === 'dark'} />}

          {/* Trail dots */}
          <AnimatePresence>
            {showTrail && trail.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 0 }}
                exit={{}}
                transition={{ duration: 0.6, delay: i * 0.02 }}
                className="absolute pointer-events-none rounded-full bg-violet-400/60"
                style={{
                  left: t.x - 3,
                  top: t.y - 3,
                  width: 6,
                  height: 6,
                }}
              />
            ))}
          </AnimatePresence>

          {/* Coordinates overlay */}
          <AnimatePresence>
            {isInside && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-3 text-[10px] font-mono text-white/30 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none"
              >
                {Math.round(cursorPos.x)}, {Math.round(cursorPos.y)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cursor info badge */}
          <div className="absolute top-3 right-3 text-[10px] font-mono bg-black/50 backdrop-blur-sm text-white/40 px-2 py-1 rounded-md pointer-events-none">
            HS {project.hotspot.x},{project.hotspot.y}
            {project.isAnimated && <span className="text-cyan-400 ml-1.5">ANIM</span>}
          </div>
        </div>
      </div>

      {/* Size strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <span className="text-[10px] text-white/20 whitespace-nowrap">All sizes:</span>
        {project.sizes.map((sz) => (
          <div key={sz.size} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="checkerboard rounded-md border border-white/[0.06]" style={{ padding: 4, width: Math.min(sz.size + 8, 56), height: Math.min(sz.size + 8, 56), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${sz.data}`}
                alt={`${sz.size}px`}
                width={Math.min(sz.size, 48)}
                height={Math.min(sz.size, 48)}
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <span className="text-[9px] font-mono text-white/25">{sz.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Preview content templates ─────────────────────────────────────────────

function CodePreviewContent() {
  const lines = [
    { indent: 0, tokens: [{ t: 'keyword', v: 'function ' }, { t: 'fn', v: 'createCursor' }, { t: 'p', v: '(' }, { t: 'param', v: 'image' }, { t: 'p', v: ': ' }, { t: 'type', v: 'File' }, { t: 'p', v: ') {' }] },
    { indent: 2, tokens: [{ t: 'keyword', v: 'const ' }, { t: 'var', v: 'buffer ' }, { t: 'p', v: '= ' }, { t: 'keyword', v: 'await ' }, { t: 'fn', v: 'sharp' }, { t: 'p', v: '(' }, { t: 'var', v: 'image' }, { t: 'p', v: ')' }] },
    { indent: 4, tokens: [{ t: 'p', v: '.' }, { t: 'fn', v: 'resize' }, { t: 'p', v: '(' }, { t: 'num', v: '32' }, { t: 'p', v: ', ' }, { t: 'num', v: '32' }, { t: 'p', v: ')' }] },
    { indent: 4, tokens: [{ t: 'p', v: '.' }, { t: 'fn', v: 'png' }, { t: 'p', v: '().' }, { t: 'fn', v: 'toBuffer' }, { t: 'p', v: '();' }] },
    { indent: 0, tokens: [{ t: 'p', v: '}' }] },
  ];
  const colors: Record<string, string> = {
    keyword: '#c792ea', fn: '#82aaff', p: '#a6accd', param: '#f07178',
    type: '#ffcb6b', var: '#f07178', num: '#f78c6c',
  };
  return (
    <div className="p-6 font-mono text-sm leading-7 select-none pointer-events-none">
      {lines.map((line, i) => (
        <div key={i} style={{ paddingLeft: line.indent * 8 }}>
          {line.tokens.map((tok, j) => (
            <span key={j} style={{ color: colors[tok.t] }}>{tok.v}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function DesktopPreviewContent() {
  return (
    <div className="absolute inset-0 flex items-end justify-start p-4">
      <div className="flex gap-3">
        {['#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'].map((color, i) => (
          <div key={i} className="w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center" style={{ backgroundColor: color + '33' }}>
            <div className="w-6 h-6 rounded-md" style={{ backgroundColor: color + '88' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function GradientPreviewContent() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <div className="text-center">
        <div className="text-5xl font-bold text-white/10">MousePRO</div>
        <div className="text-sm text-white/20 mt-2 font-mono">Move your cursor here</div>
      </div>
    </div>
  );
}

function GenericPreviewContent({ dark }: { dark: boolean }) {
  const textColor = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  return (
    <div className="p-6 pointer-events-none select-none">
      <div style={{ height: 12, borderRadius: 6, background: textColor, width: '60%', marginBottom: 8 }} />
      <div style={{ height: 8, borderRadius: 4, background: textColor, width: '80%', marginBottom: 6, opacity: 0.7 }} />
      <div style={{ height: 8, borderRadius: 4, background: textColor, width: '45%', marginBottom: 20, opacity: 0.5 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ height: 32, borderRadius: 8, background: '#7c3aed44', border: `1px solid ${borderColor}`, width: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: 8, borderRadius: 4, width: 40, background: '#7c3aed99' }} />
        </div>
        <div style={{ height: 32, borderRadius: 8, border: `1px solid ${borderColor}`, width: 80 }} />
      </div>
      <div style={{ height: 1, background: borderColor, marginBottom: 12 }} />
      <div style={{ height: 8, borderRadius: 4, background: textColor, width: '70%', marginBottom: 6, opacity: 0.6 }} />
      <div style={{ height: 8, borderRadius: 4, background: textColor, width: '55%', opacity: 0.4 }} />
    </div>
  );
}
