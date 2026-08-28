import { Laptop, Moon, Sun } from 'lucide-react';
import { ThemePreference } from '../utils/theme';
import { useTheme } from '../hooks/useTheme';

const OPTIONS: Array<{
    value: ThemePreference;
    label: string;
    icon: typeof Laptop;
}> = [
    { value: 'system', label: 'System theme', icon: Laptop },
    { value: 'light', label: 'Light theme', icon: Sun },
    { value: 'dark', label: 'Dark theme', icon: Moon },
];

export function ThemeToggle() {
    const { preference, setPreference } = useTheme();

    return (
        <div
            className="theme-toggle"
            role="group"
            aria-label="Theme preference"
        >
            {OPTIONS.map(option => {
                const Icon = option.icon;
                const isSelected = preference === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        aria-pressed={isSelected}
                        title={option.label}
                        onClick={() => setPreference(option.value)}
                        className={`theme-toggle__button ${isSelected ? 'theme-toggle__button--active' : ''}`}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                    </button>
                );
            })}
        </div>
    );
}

export default ThemeToggle;
