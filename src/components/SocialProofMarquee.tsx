import React from 'react';

const BRANDS = ["Vortex", "Nimbus", "Prysma", "Cirrus", "Kynder", "Halcyn"];

export const SocialProofMarquee = () => {
  // We duplicate the array to create a seamless infinite scroll effect
  const duplicatedBrands = [...BRANDS, ...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <div className="w-full mt-auto pb-8 z-10 relative overflow-hidden flex flex-col xl:flex-row xl:items-center items-start gap-4 px-8 border-t border-white/10 pt-8 mt-12">
      <div className="text-sm text-foreground/50 whitespace-nowrap xl:pr-6 shrink-0 font-medium">
        Relied on by brands across the globe
      </div>
      
      <div className="relative flex overflow-hidden mask-edges w-full">
        {/*
          To achieve translating 0% -> -50% properly across a duplicated list,
          the inner container holds exactly enough items and is 2x or more width.
          We use width-fit and animate it left continuously.
        */}
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap w-max">
          {duplicatedBrands.map((brand, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 liquid-glass rounded-lg flex items-center justify-center font-bold text-sm">
                {brand.charAt(0)}
              </div>
              <span className="text-base font-semibold text-foreground/80">{brand}</span>
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </div>
  );
};
