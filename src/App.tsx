import { useState, useEffect } from 'react';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Hero } from './components/Hero';
import { Onboarding } from './components/Onboarding';

function App() {
  const [isZooming, setIsZooming] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isZooming) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [isZooming]);

  if (showOnboarding) {
    return <Onboarding />;
  }

  // Generate random static stars for all around above the earth (top 0 to 60%, left 0 to 100%)
  const stars = Array.from({ length: 150 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 60}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.15
  }));

  return (
    <div className={`relative min-h-screen flex flex-col items-center bg-background overflow-x-hidden text-foreground transition-all duration-1000 ${isZooming ? 'bg-black' : ''}`}>
      <div className={`absolute inset-0 w-full h-full transition-all ${isZooming ? 'zooming-active' : ''}`}>
        <BackgroundVideo />
        
        {/* Stars everywhere above the earth, fading out as they get closer to the bottom */}
        <div 
          className={`absolute top-0 left-0 w-full h-[80%] pointer-events-none z-0 transition-opacity duration-[2500ms] ease-in-out ${isZooming ? 'opacity-0' : 'opacity-100'}`}
          style={{ maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)' }}
        >
          {stars.map(star => (
            <div 
              key={star.id} 
              className="absolute rounded-full bg-white"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity
              }}
            />
          ))}
        </div>
      </div>


      <div className={`relative z-10 w-full flex flex-col min-h-screen max-w-[1400px] mx-auto overflow-hidden transition-opacity duration-[1500ms] ${isZooming ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <main className="flex-1 flex flex-col justify-center w-full">
          <Hero onStartFree={() => setIsZooming(true)} />
        </main>
      </div>
    </div>
  );
}

export default App;
