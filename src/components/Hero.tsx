import { Button } from './ui/Button';

export const Hero = ({ onStartFree }: { onStartFree: () => void }) => {
  return (
    <section className="flex flex-col items-center justify-center text-center px-4 pt-0 pb-4 z-10 relative -mt-12 max-w-6xl mx-auto w-full group font-geist">
      
      {/* Typewriter Header - Shifted upwards relative to the earth */}
      <div className="inline-block mb-6 -translate-y-2 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h1 className="text-6xl sm:text-7xl lg:text-[6.5rem] font-semibold tracking-tighter leading-[1.1] pb-4 -mb-4 overflow-hidden whitespace-nowrap border-r-4 border-foreground pr-2 animate-typewriter animate-blink-caret max-w-[100vw]">
          Know Your Revenue<br className="hidden sm:block" />
          <span className="sm:inline hidden"> Before It Happens</span>
        </h1>
        {/* Mobile fallback since typewriter is hard cross-device */}
        <h1 className="sm:hidden text-5xl font-semibold tracking-tighter leading-[1.05] mt-2">
          Before It Happens
        </h1>
      </div>

      <p className="text-xl max-w-xl mx-auto text-[#D1D1D1] opacity-0 animate-fade-in-up md:text-2xl mb-12 leading-relaxed font-normal" style={{ animationDelay: '0.9s' }}>
        Weather-aware, calendar-smart, and built to predict red days before they hit your revenue.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 opacity-0 animate-fade-in-up mt-2" style={{ animationDelay: '1.2s' }}>
        <Button 
          variant="heroSecondary" 
          onClick={onStartFree} 
          className="text-3xl px-16 py-10 rounded-[2rem] shadow-2xl font-semibold hover:bg-white/10 transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20 active:shadow-[0_0_40px_rgba(16,185,129,0.6),0_0_80px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
        >
          Launch Your Growth
        </Button>
      </div>
    </section>
  );
};
