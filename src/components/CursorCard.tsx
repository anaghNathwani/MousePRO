'use client';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { CursorProject } from '@/lib/store';

interface Props {
  project: CursorProject;
  index: number;
}

export default function CursorCard({ project, index }: Props) {
  const { activeProjectId, setActiveProject, removeProject } = useStore();
  const isActive = activeProjectId === project.id;

  const preview = project.sizes.find((s) => s.size === 32) ?? project.sizes[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      onClick={() => setActiveProject(project.id)}
      className={`
        relative group rounded-xl p-3 cursor-pointer transition-all duration-150 select-none
        ${isActive
          ? 'bg-violet-500/15 border border-violet-500/40 shadow-glow-sm'
          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
        }
      `}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="active-pill"
          className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400"
        />
      )}

      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="relative w-10 h-10 rounded-lg checkerboard flex items-center justify-center flex-shrink-0 border border-white/[0.08]">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${preview.data}`}
              alt={project.name}
              width={32}
              height={32}
              className="cursor-canvas w-8 h-8 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
          {project.isAnimated && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500/90 border border-[#060610] flex items-center justify-center">
              <svg width="7" height="7" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate leading-none">{project.name}</p>
          <p className="text-[10px] text-white/30 font-mono mt-1">
            HS {project.hotspot.x},{project.hotspot.y} · {project.sizes.length} sizes
          </p>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); removeProject(project.id); }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
