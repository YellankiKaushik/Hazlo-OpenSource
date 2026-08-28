import { Zap } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
    return (
        <header className="sticky top-0 z-20 border-b backdrop-blur-md" style={{ background: 'var(--color-header-bg)', borderColor: 'var(--color-border)' }}>
            <div className="app-container py-3 sm:py-4">
                <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
                            <Zap className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-semibold sm:text-xl" style={{ color: 'var(--color-text-primary)' }}>
                                Hazlo by Kaushik
                            </h1>
                            <p className="hidden text-sm leading-tight sm:block" style={{ color: 'var(--color-text-muted)' }}>
                                Think it. Say it. Do it.
                            </p>
                        </div>
                    </div>

                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}

export default Header;
