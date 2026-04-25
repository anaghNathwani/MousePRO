'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

const PREVIEW_SIZES = [16, 32, 64, 128];
const CANVAS_DISPLAY = 256; // pixels — each canvas is 256px, showing cursor at 1× pixel art

interface HotspotCanvasProps {
  imageData: string;
  hotspot: { x: number; y: number };
  naturalSize: number;
  onHotspotChange: (x: number, y: number) => void;
}

function HotspotCanvas({ imageData, hotspot, naturalSize, onHotspotChange }: HotspotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = CANVAS_DISPLAY / naturalSize;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_DISPLAY, CANVAS_DISPLAY);

    // Checkerboard
    const sq = 12;
    for (let y = 0; y < CANVAS_DISPLAY; y += sq) {
      for (let x = 0; x < CANVAS_DISPLAY; x += sq) {
        ctx.fillStyle = (x / sq + y / sq) % 2 === 0 ? '#1e1e2e' : '#2a2a3e';
        ctx.fillRect(x, y, sq, sq);
      }
    }

    // Image
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, CANVAS_DISPLAY, CANVAS_DISPLAY);

      // Hotspot crosshair
      const hx = hotspot.x * scale;
      const hy = hotspot.y * scale;

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(CANVAS_DISPLAY, hy);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, CANVAS_DISPLAY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Hotspot dot
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
    };
    img.src = `data:image/png;base64,${imageData}`;
  }, [imageData, hotspot, scale]);

  useEffect(() => { draw(); }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (CANVAS_DISPLAY / rect.width);
    const py = (e.clientY - rect.top) * (CANVAS_DISPLAY / rect.height);
    const nx = Math.round(px / scale);
    const ny = Math.round(py / scale);
    onHotspotChange(
      Math.max(0, Math.min(naturalSize - 1, nx)),
      Math.max(0, Math.min(naturalSize - 1, ny))
    );
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_DISPLAY}
      height={CANVAS_DISPLAY}
      onClick={handleClick}
      className="rounded-xl border border-white/10 cursor-crosshair"
      style={{ width: '100%', aspectRatio: '1', imageRendering: 'pixelated', maxWidth: '260px' }}
      title="Click to set hotspot"
    />
  );
}

export default function CursorEditor() {
  const { projects, activeProjectId, updateProject } = useStore();
  const project = projects.find((p) => p.id === activeProjectId) ?? null;

  const [activeSize, setActiveSize] = useState(32);
  const [tab, setTab] = useState<'edit' | 'sizes' | 'animate'>('edit');
  const [animFrame, setAnimFrame] = useState(0);
  const animRef = useRef<NodeJS.Timeout | null>(null);

  // Run animation preview
  useEffect(() => {
    if (!project?.isAnimated || tab !== 'animate') return;
    animRef.current = setInterval(() => {
      setAnimFrame((f) => (f + 1) % project.frames.length);
    }, project.frameDuration);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [project, tab]);

  if (!project) return null;

  const currentSizeData = project.sizes.find((s) => s.size === activeSize) ?? project.sizes[0];

  const setHotspot = (x: number, y: number) => {
    updateProject(project.id, { hotspot: { x, y } });
  };

  const setHotspotAxis = (axis: 'x' | 'y', value: number) => {
    updateProject(project.id, {
      hotspot: { ...project.hotspot, [axis]: Math.max(0, Math.min(activeSize - 1, value)) },
    });
  };

  const setFrameDuration = (ms: number) => {
    updateProject(project.id, { frameDuration: ms });
  };

  const tabs = [
    { id: 'edit', label: 'Edit' },
    { id: 'sizes', label: 'Sizes' },
    ...(project.isAnimated ? [{ id: 'animate', label: `Animate (${project.frameCount}f)` }] : []),
  ] as const;

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white leading-none">{project.name}</h2>
          <p className="text-xs text-white/30 font-mono mt-0.5">
            {project.isAnimated ? `${project.frameCount} frames · ` : ''}
            {project.sizes.length} sizes generated
          </p>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                tab === t.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* EDIT TAB */}
        {tab === 'edit' && (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-5 flex-1"
          >
            {/* Canvas */}
            <div className="flex flex-col items-center gap-3">
              <HotspotCanvas
                imageData={currentSizeData.data}
                hotspot={project.hotspot}
                naturalSize={activeSize}
                onHotspotChange={setHotspot}
              />
              <p className="text-[10px] text-white/25 text-center">Click canvas to set hotspot</p>

              {/* Size selector */}
              <div className="flex items-center gap-1.5">
                {PREVIEW_SIZES.filter((s) => project.sizes.some((sz) => sz.size === s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all duration-150 ${
                      activeSize === s
                        ? 'bg-violet-600/80 text-white border border-violet-500/50'
                        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/70'
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Hotspot */}
              <div className="glass p-4 rounded-xl">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                  Hotspot
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['x', 'y'] as const).map((axis) => (
                    <div key={axis}>
                      <label className="text-[10px] text-white/30 font-mono uppercase block mb-1.5">
                        {axis.toUpperCase()} axis
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={activeSize - 1}
                          value={project.hotspot[axis]}
                          onChange={(e) => setHotspotAxis(axis, +e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-xs text-white/60 font-mono w-6 text-right">
                          {project.hotspot[axis]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick presets */}
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {[
                    { label: 'Top-left', x: 0, y: 0 },
                    { label: 'Center', x: Math.floor(activeSize / 2), y: Math.floor(activeSize / 2) },
                    { label: 'Top-center', x: Math.floor(activeSize / 2), y: 0 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setHotspot(p.x, p.y)}
                      className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/70 hover:bg-white/[0.07] transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cursor info */}
              <div className="glass p-4 rounded-xl">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                  Info
                </p>
                <div className="grid grid-cols-2 gap-y-2 text-xs font-mono">
                  <span className="text-white/30">Name</span>
                  <span className="text-white/70 truncate">{project.name}</span>
                  <span className="text-white/30">Hotspot</span>
                  <span className="text-white/70">{project.hotspot.x}, {project.hotspot.y}</span>
                  <span className="text-white/30">Sizes</span>
                  <span className="text-white/70">{project.sizes.map((s) => s.size).join(', ')}</span>
                  {project.isAnimated && (
                    <>
                      <span className="text-white/30">Frames</span>
                      <span className="text-cyan-400">{project.frameCount}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Rename */}
              <div className="glass p-4 rounded-xl">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                  Rename
                </p>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => updateProject(project.id, { name: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all"
                  placeholder="Cursor name…"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* SIZES TAB */}
        {tab === 'sizes' && (
          <motion.div
            key="sizes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {project.sizes.map((sz) => (
                <div key={sz.size} className="glass p-3 rounded-xl flex flex-col items-center gap-2">
                  <div className="checkerboard rounded-lg p-2 border border-white/[0.06]" style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${sz.data}`}
                      alt={`${sz.size}px`}
                      width={sz.size > 64 ? 64 : sz.size}
                      height={sz.size > 64 ? 64 : sz.size}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/40">{sz.size}×{sz.size}</span>
                  <a
                    href={`data:image/png;base64,${sz.data}`}
                    download={`${project.name}-${sz.size}.png`}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-violet-600/20 text-violet-400 border border-violet-500/20 hover:bg-violet-600/40 transition-all"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ANIMATE TAB */}
        {tab === 'animate' && project.isAnimated && (
          <motion.div
            key="animate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-5 flex-1"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="checkerboard rounded-xl border border-white/[0.08]" style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {project.frames[animFrame] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${project.frames[animFrame]}`}
                    alt={`Frame ${animFrame}`}
                    width={64}
                    height={64}
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>
              <p className="text-xs text-white/30 font-mono">
                Frame {animFrame + 1} / {project.frames.length}
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="glass p-4 rounded-xl">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Frame Duration</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={16}
                    max={500}
                    step={8}
                    value={project.frameDuration}
                    onChange={(e) => setFrameDuration(+e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-xs text-white/60 font-mono w-14 text-right">
                    {project.frameDuration}ms
                  </span>
                </div>
                <p className="text-[10px] text-white/25 mt-1.5">
                  {Math.round(1000 / project.frameDuration)} fps
                </p>
              </div>

              {/* Frames strip */}
              <div className="glass p-3 rounded-xl">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Frames</p>
                <div className="flex gap-2 flex-wrap max-h-48 overflow-y-auto">
                  {project.frames.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setAnimFrame(i)}
                      className={`checkerboard rounded-lg p-1 border transition-all ${
                        animFrame === i ? 'border-violet-500/60' : 'border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${f}`}
                        alt={`f${i}`}
                        width={24}
                        height={24}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
