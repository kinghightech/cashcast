export const BackgroundVideo = () => {
  // Random coordinates for red dots dispersed more widely across the earth
  const dots = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    top: `${55 + Math.random() * 40}%`,
    left: `${15 + Math.random() * 70}%`,
    animationDelay: `${Math.random() * 2}s`
  }));

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="object-cover absolute inset-0 w-full h-full brightness-[1.05]"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260309_042944_4a2205b7-b061-490a-852b-92d9e9955ce9.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] pointer-events-none mix-blend-multiply"></div>
      
      {/* Blinking red dots overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-80 mix-blend-screen scale-[1.02]">
        {dots.map(dot => (
          <div
            key={dot.id}
            className="absolute rounded-full bg-red-400 animate-blink blur-[0.5px] w-2.5 h-2.5 shadow-[0_0_12px_4px_rgba(248,113,113,0.9)]"
            style={{ 
              top: dot.top, 
              left: dot.left,
              animationDelay: dot.animationDelay 
            }}
          />
        ))}
      </div>
    </div>
  );
};
