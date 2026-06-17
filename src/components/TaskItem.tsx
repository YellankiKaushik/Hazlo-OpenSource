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
        flex items-center gap-3 p-3 rounded-xl transition-all duration-200
        ${task.completed
                    ? 'bg-gray-50 opacity-60'
                    : 'bg-white border border-gray-100 hover:border-gray-200'
                }
      `}
        >
            {/* Checkbox */}
            <button
                onClick={() => toggleTaskCompletion(entryId, task.id)}
                className={`
          flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center
          transition-all duration-200
          ${task.completed
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
                    }
        `}
            >
                {task.completed && <Check className="w-3 h-3" />}
            </button>

            {/* Task text */}
            <span
                className={`
          flex-1 text-sm leading-relaxed
          ${task.completed
                        ? 'text-gray-400 line-through'
                        : 'text-gray-800'
                    }
        `}
            >
                {task.text}
            </span>

            {/* Delete button */}
            <button
                onClick={() => deleteTask(entryId, task.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete task"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default TaskItem;
