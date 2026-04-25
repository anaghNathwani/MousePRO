'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { CursorProject } from '@/lib/store';

const ACCEPTED = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/x-icon': ['.ico'],
};

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function UploadZone() {
  const { addProject, setActiveProject, setProcessing, processingOptions } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setProcessing(true, 10);

      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('options', JSON.stringify(processingOptions));

        setProcessing(true, 40);

        const res = await fetch('/api/process-image', {
          method: 'POST',
          body: formData,
        });

        setProcessing(true, 80);

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Processing failed');
        }

        const result = await res.json();

        const project: CursorProject = {
          id: generateId(),
          name: file.name.replace(/\.[^.]+$/, ''),
          originalDataUrl: await fileToDataUrl(file),
          sizes: result.sizes,
          hotspot: result.hotspot,
          frameCount: result.frameCount,
          frames: result.frames,
          frameDuration: result.frameDuration,
          isAnimated: result.isAnimated,
          createdAt: Date.now(),
          tint: processingOptions.tint,
          scale: 1,
        };

        addProject(project);
        setActiveProject(project.id);
        setUploadCount((c) => c + 1);
      } catch (e) {
        setError((e as Error).message ?? 'Unknown error');
      } finally {
        setProcessing(false);
      }
    },
    [addProject, setActiveProject, setProcessing, processingOptions]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach((file) => processFile(file));
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            relative rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 select-none
            ${isDragActive && !isDragReject
              ? 'border-2 border-violet-500 bg-violet-500/10 shadow-glow-md'
              : isDragReject
              ? 'border-2 border-red-500 bg-red-500/10'
              : 'border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }
          `}
        >
          <input {...getInputProps()} />

          {/* Animated background glow */}
          <AnimatePresence>
            {isDragActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-2xl bg-glow-violet pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Icon */}
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative inline-block mb-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center mx-auto">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                className={isDragActive ? 'text-violet-400' : 'text-white/40'}
              >
                {isDragReject ? (
                  <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" />
                  </>
                ) : (
                  <>
                    <path
                      d="M4 2L4 16L8 12L11 19L13 18L10 11L15 11L4 2Z"
                      fill={isDragActive ? '#a78bfa' : 'currentColor'}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18 12V20M18 12L15 15M18 12L21 15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
            </div>
            {isDragActive && (
              <motion.div
                className="absolute -inset-2 rounded-3xl border-2 border-violet-500/50"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>

          {/* Text */}
          <AnimatePresence mode="wait">
            {isDragReject ? (
              <motion.div key="reject" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-red-400 font-medium text-lg">Unsupported file type</p>
                <p className="text-white/30 text-sm mt-1">Please drop a PNG, JPG, GIF, WEBP, SVG, or ICO</p>
              </motion.div>
            ) : isDragActive ? (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-violet-300 font-semibold text-xl">Drop to process</p>
                <p className="text-white/40 text-sm mt-1">Release to start cursor generation</p>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-white/70 font-semibold text-lg">Drop your image here</p>
                <p className="text-white/35 text-sm mt-1.5 leading-relaxed">
                  or{' '}
                  <span className="text-violet-400 underline underline-offset-2 cursor-pointer hover:text-violet-300 transition-colors">
                    browse files
                  </span>
                </p>
                <p className="text-white/20 text-xs mt-4 font-mono">
                  PNG · JPG · GIF · WEBP · SVG · ICO · up to 20MB
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success flash */}
          <AnimatePresence>
            {uploadCount > 0 && (
              <motion.div
                key={uploadCount}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Processed!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            { icon: '✦', label: 'Auto-resize to all sizes' },
            { icon: '◎', label: 'Hotspot detection' },
            { icon: '◈', label: 'Background removal' },
            { icon: '⟳', label: 'GIF animation support' },
          ].map((f) => (
            <span
              key={f.label}
              className="text-xs text-white/25 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]"
            >
              <span className="text-violet-500/60">{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
