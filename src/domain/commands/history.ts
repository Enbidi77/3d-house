import type { Project } from '../models';
import type { Command, HistoryStack } from './types';

export function createHistoryStack(maxSize = 100): HistoryStack {
  return {
    past: [],
    future: [],
    maxSize,
  };
}

export function executeOnHistory(
  project: Project,
  history: HistoryStack,
  command: Command,
): { project: Project; history: HistoryStack } {
  const nextProject = command.execute(project);
  const nextPast = [...history.past, command];
  if (nextPast.length > history.maxSize) {
    nextPast.shift();
  }
  return {
    project: nextProject,
    history: {
      ...history,
      past: nextPast,
      future: [],
    },
  };
}

export function undoOnHistory(
  project: Project,
  history: HistoryStack,
): { project: Project; history: HistoryStack; undone: Command | null } {
  if (history.past.length === 0) {
    return { project, history, undone: null };
  }
  const command = history.past[history.past.length - 1];
  const nextProject = command.undo(project);
  return {
    project: nextProject,
    history: {
      ...history,
      past: history.past.slice(0, -1),
      future: [command, ...history.future],
    },
    undone: command,
  };
}

export function redoOnHistory(
  project: Project,
  history: HistoryStack,
): { project: Project; history: HistoryStack; redone: Command | null } {
  if (history.future.length === 0) {
    return { project, history, redone: null };
  }
  const [command, ...restFuture] = history.future;
  const nextProject = command.execute(project);
  return {
    project: nextProject,
    history: {
      ...history,
      past: [...history.past, command],
      future: restFuture,
    },
    redone: command,
  };
}
