'use client';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

export default function Header() {
  const { showExportModal, setShowExportModal, projects, activeProjectId } = useStore();
  const hasActive = !!activeProjectId;

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
      {/* Background blur */}
      <div className="absolute inset-0 bg-[#060610]/80 backdrop-blur-xl -z-10" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-glow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M4 2L4 16L8 12L11 19L13 18L10 11L15 11L4 2Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 blur-md opacity-40 -z-10" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight gradient-text leading-none">MousePRO</h1>
          <p className="text-[10px] text-white/30 font-mono leading-none mt-0.5">Advanced Cursor Studio</p>
        </div>
      </motion.div>

      {/* Center status */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-xs text-white/30"
      >
        {projects.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono">
            {projects.length} cursor{projects.length !== 1 ? 's' : ''}
          </span>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-2"
      >
        {hasActive && (
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-primary text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        )}
        <a
          href="https://github.com/anaghnathwani/mousepro"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost text-xs"
          title="MousePRO on GitHub"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </motion.div>
    </header>
  );
}
