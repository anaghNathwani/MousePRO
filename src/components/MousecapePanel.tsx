'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { exportToMousecape } from '@/lib/cursorFormats';
import type { CursorProject } from '@/lib/store';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.mousecape;

interface CapeSet {
  id: string;
  name: string;
  path: string;
  preview: string | null;
  cursorCount: number;
}

interface MCStatus {
  installed: boolean;
  libraryPath: string | null;
  sets: CapeSet[];
}

interface ImportedCursor {
  name: string;
  hotspot: { x: number; y: number };
  sizes: { size: number; data: string }[];
  preview: string;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function MousecapePanel() {
  const { projects, activeProjectId, addProject, setActiveProject } = useStore();
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const [status, setStatus] = useState<MCStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [importingPath, setImportingPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isElectron) return;
    setLoading(true);
    const s = await (window as any).electronAPI.mousecape.status();
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (!isElectron) return null;

  // ── Push active cursor to Mousecape ────────────────────────────────────
  const handlePush = async () => {
    if (!activeProject || pushing) return;
    setPushing(true);
    setPushResult(null);
    try {
      const capeXML = exportToMousecape(activeProject);
      const res = await (window as any).electronAPI.mousecape.push(capeXML, activeProject.name);
      if (res.success) {
        setPushResult({ ok: true, msg: res.method === 'library' ? 'Added to Mousecape library' : 'Opened in Mousecape' });
        await refresh();
      } else {
        setPushResult({ ok: false, msg: 'Push failed' });
      }
    } catch (e) {
      setPushResult({ ok: false, msg: String(e) });
    } finally {
      setPushing(false);
      setTimeout(() => setPushResult(null), 3000);
    }
  };

  // ── Remove a set from Mousecape's library ──────────────────────────────
  const handleRemove = async (set: CapeSet) => {
    setRemovingPath(set.path);
    await (window as any).electronAPI.mousecape.remove(set.path);
    await refresh();
    setRemovingPath(null);
  };

  // ── Import a Mousecape set into MousePRO ───────────────────────────────
  const handleImport = async (set: CapeSet) => {
    setImportingPath(set.path);
    try {
      const res = await (window as any).electronAPI.mousecape.readSet(set.path);
      if (!res.success || !res.cursors?.length) return;

      for (const cursor of res.cursors as ImportedCursor[]) {
        const project: CursorProject = {
          id: generateId(),
          name: cursor.name,
          originalDataUrl: `data:image/png;base64,${cursor.sizes[0].data}`,
          sizes: cursor.sizes,
          hotspot: cursor.hotspot,
          frameCount: 1,
          frames: [],
          frameDuration: 100,
          isAnimated: false,
          createdAt: Date.now(),
          tint: null,
          scale: 1,
        };
        addProject(project);
        setActiveProject(project.id);
      }
    } finally {
      setImportingPath(null);
    }
  };

  if (!status) {
    return (
      <div className="px-4 py-3 flex items-center gap-2">
        <svg className="animate-spin text-white/20" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-[10px] text-white/20">Checking Mousecape…</span>
      </div>
    );
  }

  if (!status.installed) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
          <span className="text-[10px] text-white/30">Mousecape not installed</span>
        </div>
        <a
          href="https://github.com/alexzielenski/Mousecape/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-violet-400/70 underline underline-offset-2 hover:text-violet-400 transition-colors"
        >
          Download Mousecape →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[10px] text-white/40">
            {status.sets.length} set{status.sets.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-white/50 transition-colors"
            title="Refresh"
          >
            <svg className={loading ? 'animate-spin' : ''} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
          {/* Open Mousecape */}
          <button
            onClick={() => (window as any).electronAPI.mousecape.launch()}
            className="w-5 h-5 flex items-center justify-center rounded text-white/20 hover:text-white/50 transition-colors"
            title="Open Mousecape"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Push active cursor */}
      {activeProject && (
        <div className="px-3 pb-2">
          <motion.button
            onClick={handlePush}
            disabled={pushing}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all ${
              pushResult?.ok
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : pushResult && !pushResult.ok
                ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
            }`}
          >
            {pushing ? (
              <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : pushResult?.ok ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 2L4 16L8 12L11 19L13 18L10 11L15 11L4 2Z" fill="currentColor" strokeLinejoin="round" />
                <path d="M20 8l-2 2m0 0l-2-2m2 2V4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {pushResult ? pushResult.msg : pushing ? 'Sending…' : `Send "${activeProject.name}" to Mousecape`}
          </motion.button>
        </div>
      )}

      {/* Library list */}
      <div className="flex flex-col gap-1 px-3 pb-3 max-h-48 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {status.sets.length === 0 ? (
            <p className="text-[10px] text-white/20 text-center py-3">No cursor sets in library</p>
          ) : (
            status.sets.map((set) => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] transition-all"
              >
                {/* Preview */}
                <div className="w-7 h-7 rounded-md checkerboard border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  {set.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/png;base64,${set.preview}`}
                      alt={set.name}
                      width={20}
                      height={20}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-sm bg-white/10" />
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/70 truncate leading-none">{set.name}</p>
                  <p className="text-[9px] text-white/25 mt-0.5 font-mono">
                    {set.cursorCount} cursor{set.cursorCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Import into MousePRO */}
                  <button
                    onClick={() => handleImport(set)}
                    disabled={importingPath === set.path}
                    title="Import into MousePRO"
                    className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  >
                    {importingPath === set.path ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </button>

                  {/* Delete from library */}
                  <button
                    onClick={() => handleRemove(set)}
                    disabled={removingPath === set.path}
                    title="Remove from Mousecape library"
                    className="w-6 h-6 flex items-center justify-center rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    {removingPath === set.path ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
