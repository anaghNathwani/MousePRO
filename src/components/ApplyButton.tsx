'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

type Method = 'native' | 'process' | 'mousecape';
type Reason = 'accessibility' | 'no-helper' | 'no-method' | 'no-project';

interface Support {
  hasHelper: boolean;
  hasMousecape: boolean;
  accessibilityTrusted: boolean;
}

interface ApplyResult {
  success: boolean;
  method?: Method;
  detail?: string;
  reason?: Reason;
}

type Phase = 'idle' | 'checking' | 'applying' | 'success' | 'error';

const METHOD_LABEL: Record<Method, { label: string; color: string }> = {
  native: { label: 'Applied system-wide', color: '#10b981' },
  process: { label: 'Applied to app window', color: '#f59e0b' },
  mousecape: { label: 'Sent to Mousecape', color: '#06b6d4' },
};

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

export default function ApplyButton() {
  const { projects, activeProjectId } = useStore();
  const project = projects.find((p) => p.id === activeProjectId) ?? null;

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [support, setSupport] = useState<Support | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Check support status once when project is selected
  useEffect(() => {
    if (!project || !isElectron) return;
    setPhase('checking');
    (window as any).electronAPI.checkCursorSupport().then((s: Support) => {
      setSupport(s);
      setPhase('idle');
    });
  }, [project?.id]);

  // Reset when project changes
  useEffect(() => {
    setResult(null);
    setPhase('idle');
    setShowDetail(false);
  }, [activeProjectId]);

  if (!project) return null;

  // Not running in Electron — show nothing (web mode)
  if (!isElectron) return null;

  const handleApply = async () => {
    if (phase === 'applying') return;
    setPhase('applying');
    setResult(null);

    const size32 = project.sizes.find((s) => s.size === 32) ?? project.sizes[0];

    const res: ApplyResult = await (window as any).electronAPI.applyCursor(
      size32.data,
      project.hotspot.x,
      project.hotspot.y,
      32
    );

    setResult(res);
    setPhase(res.success ? 'success' : 'error');

    if (res.success) {
      setTimeout(() => setPhase('idle'), 4000);
    }
  };

  const handleReset = async () => {
    await (window as any).electronAPI.resetCursor();
    setResult(null);
    setPhase('idle');
  };

  const handleRequestPermission = async () => {
    const r = await (window as any).electronAPI.requestAccessibility();
    if (r.granted) {
      setSupport((s) => s ? { ...s, accessibilityTrusted: true } : s);
    }
  };

  // Determine which capability tier we have
  const tier = !support
    ? 'unknown'
    : support.hasHelper && support.accessibilityTrusted
    ? 'full'
    : support.hasHelper && !support.accessibilityTrusted
    ? 'needs-permission'
    : support.hasMousecape
    ? 'mousecape'
    : 'none';

  return (
    <div className="flex flex-col gap-2">
      {/* Main apply button */}
      <motion.button
        onClick={handleApply}
        disabled={phase === 'applying' || phase === 'checking'}
        whileHover={phase === 'idle' || phase === 'success' ? { scale: 1.02 } : {}}
        whileTap={phase === 'idle' || phase === 'success' ? { scale: 0.98 } : {}}
        className={`
          relative w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl
          font-semibold text-sm transition-all duration-200 overflow-hidden
          ${phase === 'applying' || phase === 'checking'
            ? 'bg-white/[0.06] text-white/40 cursor-not-allowed border border-white/[0.06]'
            : phase === 'success'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : phase === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer'
            : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-glow-sm hover:shadow-glow-md border border-violet-500/30 cursor-pointer'
          }
        `}
      >
        {/* Shimmer animation while applying */}
        {phase === 'applying' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Icon */}
        <span className="relative z-10 flex-shrink-0">
          {phase === 'applying' || phase === 'checking' ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : phase === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : phase === 'error' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 2L4 16L8 12L11 19L13 18L10 11L15 11L4 2Z" fill="currentColor" strokeLinejoin="round" />
              <path d="M20 8l-2 2m0 0l-2-2m2 2V4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <span className="relative z-10">
          {phase === 'checking' ? 'Checking…' :
           phase === 'applying' ? 'Applying…' :
           phase === 'success' && result?.method ? METHOD_LABEL[result.method].label :
           phase === 'error' ? 'Failed — retry' :
           'Apply to System'}
        </span>
      </motion.button>

      {/* Result detail */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`rounded-xl p-3 text-xs leading-relaxed ${
                result.success
                  ? 'bg-emerald-500/5 border border-emerald-500/15 text-emerald-400/80'
                  : 'bg-red-500/5 border border-red-500/15 text-red-400/80'
              }`}
            >
              {result.detail}

              {/* Accessibility shortcut */}
              {result.reason === 'accessibility' && (
                <button
                  onClick={handleRequestPermission}
                  className="block mt-2 text-[10px] underline underline-offset-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  Open Accessibility Settings →
                </button>
              )}

              {/* No helper instructions */}
              {result.reason === 'no-method' && (
                <div className="mt-2 font-mono text-[10px] text-white/30 bg-black/30 rounded-lg p-2">
                  cd helper && bash build.sh
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier indicator */}
      <AnimatePresence>
        {support && phase === 'idle' && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              tier === 'full' ? 'bg-emerald-400' :
              tier === 'needs-permission' ? 'bg-amber-400' :
              tier === 'mousecape' ? 'bg-cyan-400' :
              'bg-white/20'
            }`} />
            <p className="text-[10px] text-white/25">
              {tier === 'full' && 'System-wide via native helper'}
              {tier === 'needs-permission' && (
                <button onClick={handleRequestPermission} className="underline underline-offset-2 hover:text-white/40 transition-colors">
                  Grant Accessibility permission for system-wide
                </button>
              )}
              {tier === 'mousecape' && 'Will apply via Mousecape'}
              {tier === 'none' && (
                <span>
                  Build <span className="font-mono">helper/build.sh</span> on macOS for system-wide
                </span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset button */}
      {phase === 'success' && result?.method === 'native' && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleReset}
          className="btn btn-ghost text-xs w-full justify-center text-white/30 hover:text-white/50"
        >
          Reset to default cursor
        </motion.button>
      )}
    </div>
  );
}
