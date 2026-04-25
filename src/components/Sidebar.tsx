'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import CursorCard from './CursorCard';

export default function Sidebar() {
  const { projects, processingOptions, setProcessingOptions, isProcessing, processingProgress } = useStore();
  const [optionsOpen, setOptionsOpen] = useState(false);

  return (
    <aside className="flex flex-col h-full border-r border-white/[0.06] bg-[#0a0a18]/60 w-64 flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
            Cursors
          </span>
          <span className="text-[10px] font-mono text-white/20">
            {projects.length}
          </span>
        </div>
      </div>

      {/* Processing bar */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-violet-500/5 border-b border-violet-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-violet-400">Processing…</span>
                <span className="text-[10px] font-mono text-violet-400/60">{processingProgress}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                  initial={{ width: '5%' }}
                  animate={{ width: `${processingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cursor list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 text-center"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/10 mb-2">
                <path d="M4 2L4 16L8 12L11 19L13 18L10 11L15 11L4 2Z" fill="currentColor" />
              </svg>
              <p className="text-xs text-white/20">No cursors yet</p>
              <p className="text-[10px] text-white/10 mt-0.5">Drop an image to start</p>
            </motion.div>
          ) : (
            projects.map((p, i) => (
              <CursorCard key={p.id} project={p} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Processing options */}
      <div className="border-t border-white/[0.04]">
        <button
          onClick={() => setOptionsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs text-white/30 hover:text-white/50 hover:bg-white/[0.02] transition-all"
        >
          <span className="font-semibold uppercase tracking-widest text-[10px]">Processing Options</span>
          <motion.svg
            animate={{ rotate: optionsOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {optionsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 flex flex-col gap-3">
                {[
                  { key: 'removeBackground', label: 'Remove Background', desc: 'Auto-detect and remove solid BG' },
                  { key: 'sharpenEdges', label: 'Sharpen Edges', desc: 'Improve clarity at small sizes' },
                  { key: 'normalizeAlpha', label: 'Normalize Alpha', desc: 'Adjust contrast/brightness' },
                ] .map((opt) => (
                  <div key={opt.key} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/60 font-medium">{opt.label}</p>
                      <p className="text-[10px] text-white/25 mt-0.5 leading-tight">{opt.desc}</p>
                    </div>
                    <div
                      onClick={() => setProcessingOptions({ [opt.key]: !processingOptions[opt.key as keyof typeof processingOptions] })}
                      className={`toggle mt-0.5 flex-shrink-0 ${processingOptions[opt.key as keyof typeof processingOptions] ? 'active' : ''}`}
                    >
                      <div className="toggle-thumb" />
                    </div>
                  </div>
                ))}

                <div>
                  <p className="text-[11px] text-white/60 font-medium mb-1.5">Tint Color</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={processingOptions.tint ?? '#ffffff'}
                      onChange={(e) => setProcessingOptions({ tint: e.target.value })}
                      className="w-7 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0"
                      style={{ colorScheme: 'dark' }}
                    />
                    <span className="text-[10px] font-mono text-white/30">
                      {processingOptions.tint ?? 'None'}
                    </span>
                    {processingOptions.tint && (
                      <button
                        onClick={() => setProcessingOptions({ tint: null })}
                        className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-white/20 leading-tight mt-1">
                  Options apply to new uploads. Re-upload to reprocess with changes.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
