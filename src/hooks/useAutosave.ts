'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '@/domain';
import { loadAutosave, saveAutosave } from '@/services/indexedDb';
import { useHistoryStore, useProjectStore } from '@/stores';

export interface AutosaveRecoveryState {
  draft: Project | null;
  lastSavedAt: string | null;
  restoreDraft: () => void;
  dismissDraft: () => void;
}

export function useAutosave(debounceMs = 1500): AutosaveRecoveryState {
  const project = useProjectStore((s) => s.project);
  const isDirty = useProjectStore((s) => s.isDirty);
  const setProject = useProjectStore((s) => s.setProject);
  const clearHistory = useHistoryStore((s) => s.clear);

  const [draft, setDraft] = useState<Project | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const checkedStartupRef = useRef(false);

  // Check for existing autosave draft once on mount
  useEffect(() => {
    if (checkedStartupRef.current) return;
    checkedStartupRef.current = true;

    let cancelled = false;
    loadAutosave()
      .then((saved) => {
        if (cancelled || !saved) return;
        const current = useProjectStore.getState().project;
        if (
          saved.id !== current.id ||
          new Date(saved.updatedAt).getTime() > new Date(current.updatedAt).getTime() + 1000
        ) {
          setDraft(saved);
        }
      })
      .catch(() => {
        // IndexedDB may be unavailable in restricted contexts
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave whenever project changes and is dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setTimeout(() => {
      saveAutosave(project)
        .then(() => {
          setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch(() => {
          // Ignore transient storage errors
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [project, isDirty, debounceMs]);

  const restoreDraft = useCallback(() => {
    if (!draft) return;
    setProject(draft, true);
    clearHistory();
    setDraft(null);
  }, [draft, setProject, clearHistory]);

  const dismissDraft = useCallback(() => {
    setDraft(null);
  }, []);

  return {
    draft,
    lastSavedAt,
    restoreDraft,
    dismissDraft,
  };
}
