import { Check, Trash2 } from 'lucide-react';
import { Task } from '../types';
import { useHazloStore } from '../store/useStore';

interface TaskItemProps {
    task: Task;
    entryId: string;
}

export function TaskItem({ task, entryId }: TaskItemProps) {
    const toggleTaskCompletion = useHazloStore(state => state.toggleTaskCompletion);
    const deleteTask = useHazloStore(state => state.deleteTask);

    return (
        <div
            className={`
        flex items-start gap-3 rounded-xl border p-3 transition-colors duration-200
        ${task.completed
                    ? 'opacity-70'
                    : ''
                }
      `}
            style={{
                background: task.completed ? 'var(--color-subtle)' : 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
            }}
        >
            <button
                type="button"
                onClick={() => toggleTaskCompletion(entryId, task.id)}
                className={`
          task-check-button flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2
          transition-colors duration-200
          ${task.completed
                        ? ''
                        : ''
                    }
        `}
                style={{
                    background: task.completed ? 'var(--color-success-dot)' : 'transparent',
                    borderColor: task.completed ? 'var(--color-success-dot)' : 'var(--color-border-strong)',
                    color: 'white',
                }}
                aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
                aria-pressed={task.completed}
            >
                {task.completed && <Check className="h-3 w-3" aria-hidden="true" />}
            </button>

            <span
                className={`
          min-w-0 flex-1 overflow-wrap-anywhere text-sm leading-6
          ${task.completed
                        ? 'line-through'
                        : ''
                    }
        `}
                style={{ color: task.completed ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
            >
                {task.text}
            </span>

            <button
                type="button"
                onClick={() => deleteTask(entryId, task.id)}
                className="destructive-icon-button flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors"
                aria-label="Delete task"
                title="Delete task"
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}

export default TaskItem;
