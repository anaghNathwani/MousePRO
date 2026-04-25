'use client';
import { create } from 'zustand';

export interface CursorSize {
  size: number;
  data: string; // base64 PNG
}

export interface CursorProject {
  id: string;
  name: string;
  originalDataUrl: string;
  sizes: CursorSize[];
  hotspot: { x: number; y: number };
  frameCount: number;
  frames: string[]; // base64 PNGs for animation frames
  frameDuration: number; // ms per frame
  isAnimated: boolean;
  createdAt: number;
  tint: string | null; // hex color or null
  scale: number; // 1.0 default
}

export interface CursorSet {
  id: string;
  name: string;
  description: string;
  cursors: string[]; // cursor project IDs
  createdAt: number;
}

interface ProcessingOptions {
  removeBackground: boolean;
  sharpenEdges: boolean;
  normalizeAlpha: boolean;
  tint: string | null;
}

interface Store {
  projects: CursorProject[];
  sets: CursorSet[];
  activeProjectId: string | null;
  activeSetId: string | null;
  isProcessing: boolean;
  processingProgress: number;
  showExportModal: boolean;
  processingOptions: ProcessingOptions;

  addProject: (project: CursorProject) => void;
  updateProject: (id: string, updates: Partial<CursorProject>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;

  addSet: (set: CursorSet) => void;
  updateSet: (id: string, updates: Partial<CursorSet>) => void;
  removeSet: (id: string) => void;
  setActiveSet: (id: string | null) => void;
  addCursorToSet: (setId: string, cursorId: string) => void;

  setProcessing: (processing: boolean, progress?: number) => void;
  setShowExportModal: (show: boolean) => void;
  setProcessingOptions: (opts: Partial<ProcessingOptions>) => void;
}

export const useStore = create<Store>((set) => ({
  projects: [],
  sets: [],
  activeProjectId: null,
  activeSetId: null,
  isProcessing: false,
  processingProgress: 0,
  showExportModal: false,
  processingOptions: {
    removeBackground: false,
    sharpenEdges: true,
    normalizeAlpha: false,
    tint: null,
  },

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    })),

  setActiveProject: (id) => set({ activeProjectId: id }),

  addSet: (s) => set((state) => ({ sets: [s, ...state.sets] })),

  updateSet: (id, updates) =>
    set((state) => ({
      sets: state.sets.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  removeSet: (id) =>
    set((state) => ({
      sets: state.sets.filter((s) => s.id !== id),
      activeSetId: state.activeSetId === id ? null : state.activeSetId,
    })),

  setActiveSet: (id) => set({ activeSetId: id }),

  addCursorToSet: (setId, cursorId) =>
    set((state) => ({
      sets: state.sets.map((s) =>
        s.id === setId && !s.cursors.includes(cursorId)
          ? { ...s, cursors: [...s.cursors, cursorId] }
          : s
      ),
    })),

  setProcessing: (processing, progress = 0) =>
    set({ isProcessing: processing, processingProgress: progress }),

  setShowExportModal: (show) => set({ showExportModal: show }),

  setProcessingOptions: (opts) =>
    set((state) => ({
      processingOptions: { ...state.processingOptions, ...opts },
    })),
}));
