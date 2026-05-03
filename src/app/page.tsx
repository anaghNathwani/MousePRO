'use client';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import UploadZone from '@/components/UploadZone';
import CursorEditor from '@/components/CursorEditor';
import PreviewArea from '@/components/PreviewArea';
import ExportModal from '@/components/ExportModal';
import ApplyButton from '@/components/ApplyButton';
import PresetsGrid from '@/components/PresetsGrid';
import { useStore } from '@/lib/store';

export default function Home() {
  const { activeProjectId, setShowExportModal } = useStore();
  const hasActive = !!activeProjectId;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#060610]">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute -top-64 -left-64 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-64 -right-64 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />
        <div className="absolute inset-0 dot-grid opacity-50" />
      </div>

      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {!hasActive ? (
              /* Upload view */
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col overflow-y-auto"
              >
                <UploadZone />

                {/* Presets */}
                <PresetsGrid />

                {/* Feature showcase */}
                <div className="px-8 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto w-full">
                  {[
                    {
                      title: '7 sizes generated',
                      desc: '16px to 256px, all in one upload',
                      icon: '◈',
                      color: '#7c3aed',
                    },
                    {
                      title: 'Live preview',
                      desc: 'See your cursor work in real-time',
                      icon: '◎',
                      color: '#06b6d4',
                    },
                    {
                      title: '5 export formats',
                      desc: 'macOS, Windows, Linux, CSS, SVG',
                      icon: '↓',
                      color: '#10b981',
                    },
                    {
                      title: 'GIF animation',
                      desc: 'Animated cursors from GIF files',
                      icon: '⟳',
                      color: '#f59e0b',
                    },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="glass p-4 rounded-xl flex flex-col gap-2 glass-hover"
                    >
                      <div
                        className="text-xl font-bold"
                        style={{ color: f.color }}
                      >
                        {f.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/80">{f.title}</p>
                        <p className="text-xs text-white/30 mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Editor view */
              <motion.div
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-hidden flex"
              >
                {/* Editor panel */}
                <div className="flex-1 overflow-y-auto p-5 border-r border-white/[0.05]">
                  <CursorEditor />
                </div>

                {/* Preview panel */}
                <div className="w-80 flex-shrink-0 overflow-hidden p-5 flex flex-col gap-4">
                  <PreviewArea />

                  {/* Apply to system */}
                  <ApplyButton />

                  {/* Divider */}
                  <div className="h-px bg-white/[0.05]" />

                  {/* Quick export */}
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="btn btn-secondary w-full justify-center text-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export Cursor
                  </button>

                  {/* Upload another */}
                  <label className="btn btn-secondary w-full justify-center text-sm cursor-pointer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Upload Another
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        for (const file of files) {
                          const form = new FormData();
                          form.append('image', file);
                          // Trigger upload via UploadZone logic — page just dispatches
                          await triggerFileUpload(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <ExportModal />
    </div>
  );
}

// Trigger file processing outside UploadZone (for the "Upload Another" button)
async function triggerFileUpload(file: File) {
  const { addProject, setActiveProject, setProcessing } = useStore.getState();

  setProcessing(true, 10);
  try {
    const formData = new FormData();
    formData.append('image', file);
    const opts = useStore.getState().processingOptions;
    formData.append('options', JSON.stringify(opts));

    setProcessing(true, 40);
    const res = await fetch('/api/process-image', { method: 'POST', body: formData });
    setProcessing(true, 80);

    if (!res.ok) throw new Error('Processing failed');

    const result = await res.json();
    const originalDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const project = {
      id,
      name: file.name.replace(/\.[^.]+$/, ''),
      originalDataUrl,
      sizes: result.sizes,
      hotspot: result.hotspot,
      frameCount: result.frameCount,
      frames: result.frames,
      frameDuration: result.frameDuration,
      isAnimated: result.isAnimated,
      createdAt: Date.now(),
      tint: opts.tint,
      scale: 1,
    };

    addProject(project);
    setActiveProject(project.id);
  } finally {
    setProcessing(false);
  }
}
