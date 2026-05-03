'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PRESETS, generatePresetProject, type Preset } from '@/lib/presets';
import { useStore } from '@/lib/store';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'os', label: 'OS Style' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'neon', label: 'Neon' },
  { id: 'fun', label: 'Fun' },
] as const;

function PresetThumbnail({ preset }: { preset: Preset }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 32, 32);
    preset.draw(ctx, 32);
  }, [preset]);

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      className="w-8 h-8"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export default function PresetsGrid() {
  const { addProject, setActiveProject } = useStore();
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState<string | null>(null);

  const visible = filter === 'all' ? PRESETS : PRESETS.filter((p) => p.category === filter);

  const handleSelect = async (preset: Preset) => {
    if (loading) return;
    setLoading(preset.id);
    try {
      const project = await generatePresetProject(preset);
      addProject(project);
      setActiveProject(project.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="px-8 pb-10 max-w-5xl mx-auto w-full">
      {/* Section heading */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white/60">Start from a preset</h2>
          <p className="text-xs text-white/25 mt-0.5">Click any preset to load it instantly</p>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                filter === cat.id
                  ? 'bg-white/10 text-white/80'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {visible.map((preset) => (
          <motion.button
            key={preset.id}
            onClick={() => handleSelect(preset)}
            disabled={!!loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group relative flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left"
          >
            {/* Checkerboard bg + thumbnail */}
            <div className="w-10 h-10 rounded-lg checkerboard border border-white/[0.08] flex items-center justify-center flex-shrink-0">
              {loading === preset.id ? (
                <svg className="animate-spin text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <PresetThumbnail preset={preset} />
              )}
            </div>

            {/* Label */}
            <div className="w-full text-center">
              <p className="text-[11px] font-medium text-white/70 truncate leading-none">{preset.name}</p>
              <p className="text-[9px] text-white/25 mt-0.5 truncate leading-tight">{preset.description}</p>
            </div>

            {/* Category badge */}
            <span className={`absolute top-1.5 right-1.5 text-[8px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
              preset.category === 'neon'
                ? 'text-violet-400/70 bg-violet-500/10'
                : preset.category === 'os'
                ? 'text-cyan-400/70 bg-cyan-500/10'
                : preset.category === 'fun'
                ? 'text-amber-400/70 bg-amber-500/10'
                : 'text-white/30 bg-white/5'
            }`}>
              {preset.category}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
