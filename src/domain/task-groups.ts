import type { Task } from './model';
export interface TaskGroup {
  key: 'overdue' | 'today' | 'upcoming' | 'history';
  label: string;
  tasks: Task[];
}
export function groupPendingTasks(tasks: readonly Task[], date: string): TaskGroup[] {
  const groups: TaskGroup[] = [
    { key: 'overdue', label: '已逾期', tasks: [] },
    { key: 'today', label: '今天', tasks: [] },
    { key: 'upcoming', label: '之后', tasks: [] },
  ];
  for (const task of tasks
    .filter((t) => t.status === 'pending')
    .slice()
    .sort((a, b) => a.due.localeCompare(b.due))) {
    groups[task.due < date ? 0 : task.due === date ? 1 : 2].tasks.push(task);
  }
  return groups.filter((g) => g.tasks.length > 0);
}
