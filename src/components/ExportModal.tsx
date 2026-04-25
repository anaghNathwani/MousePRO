'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

type Format = 'zip' | 'cape' | 'cur' | 'css' | 'svg';

interface FormatOption {
  id: Format;
  name: string;
  ext: string;
  description: string;
  badge?: string;
  color: string;
  icon: React.ReactNode;
}

const FORMATS: FormatOption[] = [
  {
    id: 'zip',
    name: 'Complete Package',
    ext: '.zip',
    description: 'All sizes + Windows .cur + macOS .cape + CSS + SVG + README',
    badge: 'Recommended',
    color: '#7c3aed',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  {
    id: 'cape',
    name: 'macOS Mousecape',
    ext: '.cape',
    description: 'Import into Mousecape to apply on macOS system-wide',
    badge: 'macOS',
    color: '#06b6d4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    id: 'cur',
    name: 'Windows Cursor',
    ext: '.cur',
    description: 'Native Windows cursor file with embedded hotspot',
    badge: 'Windows',
    color: '#0078d4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="20" rx="4" />
        <path d="M7 7l4 10 2-5 5-2L7 7z" fill="currentColor" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'css',
    name: 'CSS Snippet',
    ext: '.css',
    description: 'Ready-to-paste CSS with base64 cursor and hotspot',
    badge: 'Web',
    color: '#f59e0b',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'svg',
    name: 'SVG Cursor',
    ext: '.svg',
    description: 'SVG file with embedded PNG and hotspot comment',
    badge: 'Vector',
    color: '#10b981',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
];

export default function ExportModal() {
  const { projects, activeProjectId, showExportModal, setShowExportModal } = useStore();
  const project = projects.find((p) => p.id === activeProjectId) ?? null;
  const [downloading, setDownloading] = useState<Format | null>(null);
  const [done, setDone] = useState<Format | null>(null);

  if (!showExportModal || !project) return null;

  const download = async (format: Format) => {
    if (downloading) return;
    setDownloading(format);
    setDone(null);

    try {
      const res = await fetch('/api/export-cursor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, format }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = project.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const ext = FORMATS.find((f) => f.id === format)!.ext;
      a.download = format === 'zip' ? `${safeName}-cursor-pack${ext}` : `${safeName}${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(format);
      setTimeout(() => setDone(null), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative z-10 w-full max-w-xl glass rounded-2xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
        >
          {/* Gradient top bar */}
          <div className="h-0.5 bg-gradient-to-r from-violet-500 via-cyan-500 to-violet-500" />

          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 2px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Export Cursor</h2>
                <p className="text-xs text-white/30 mt-0.5 font-mono">{project.name}</p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Cursor preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5">
              <div className="checkerboard w-14 h-14 rounded-xl border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${(project.sizes.find((s) => s.size === 64) ?? project.sizes[0]).data}`}
                  alt={project.name}
                  width={48}
                  height={48}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{project.name}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {project.sizes.map((sz) => (
                    <span key={sz.size} className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06]">
                      {sz.size}px
                    </span>
                  ))}
                  {project.isAnimated && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md border border-cyan-500/20">
                      {project.frameCount} frames
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-white/20 font-mono flex-shrink-0">
                HS {project.hotspot.x},{project.hotspot.y}
              </div>
            </div>

            {/* Format options */}
            <div className="grid gap-2">
              {FORMATS.map((fmt) => (
                <motion.button
                  key={fmt.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => download(fmt.id)}
                  disabled={!!downloading}
                  className={`relative w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 ${
                    done === fmt.id
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : downloading === fmt.id
                      ? 'bg-white/[0.06] border-white/[0.12]'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: fmt.color + '22', color: fmt.color, border: `1px solid ${fmt.color}33` }}
                  >
                    {downloading === fmt.id ? (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : done === fmt.id ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      fmt.icon
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{fmt.name}</span>
                      {fmt.badge && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: fmt.color + '22', color: fmt.color, border: `1px solid ${fmt.color}33` }}
                        >
                          {fmt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{fmt.description}</p>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 text-white/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* macOS install hint */}
            <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
              <p className="text-[11px] text-cyan-400/70 leading-relaxed">
                <strong className="text-cyan-400">macOS tip:</strong> Download the .cape file and drag it into{' '}
                <a href="https://github.com/alexzielenski/Mousecape" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-300 transition-colors">
                  Mousecape
                </a>{' '}
                to apply system-wide. Requires Mousecape 0.0.6+
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
