import { CircleDollarSign, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';

export const Navbar = () => {
  return (
    <nav className="w-full max-w-[850px] mx-auto mt-6 px-4 z-50 relative opacity-0 animate-fade-in-up" style={{ animationDelay: '0s' }}>
      <div className="liquid-glass rounded-3xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 shadow-lg hover:scale-110 transition-transform duration-500 hover:rotate-2">
            <img src="/logo.png" alt="Cashcast" className="w-full h-full object-cover animate-float" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Cashcast</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6 pr-4">
          <button className="flex items-center gap-1 text-base text-foreground/90 hover:text-white transition-colors">
            Features <ChevronDown className="w-4 h-4 opacity-70" />
          </button>
          <button className="text-base text-foreground/90 hover:text-white transition-colors">
            Solutions
          </button>
          <button className="text-base text-foreground/90 hover:text-white transition-colors">
            Plans
          </button>
          <button className="flex items-center gap-1 text-base text-foreground/90 hover:text-white transition-colors">
            Learning <ChevronDown className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>
    </nav>
  );
};
