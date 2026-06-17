import { Zap } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-2xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
                            Hazlo
                        </h1>
                    </div>

                    {/* Tagline */}
                    <span className="text-sm text-gray-500 hidden sm:block">
                        Think it. Say it. Do it.
                    </span>
                </div>
            </div>
        </header>
    );
}

export default Header;
