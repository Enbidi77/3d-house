import type { Project } from '../models';

export interface Command {
  readonly id: string;
  readonly label: string;
  execute(project: Project): Project;
  undo(project: Project): Project;
}

export interface HistoryStack {
  past: Command[];
  future: Command[];
  maxSize: number;
}
