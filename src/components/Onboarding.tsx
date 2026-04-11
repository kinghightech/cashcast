import { useState, useEffect, useRef } from 'react';
import { Dashboard, TrafficAnchor } from './Dashboard';
import {
  UtensilsCrossed, Coffee, CakeSlice, Shirt, Store, Smartphone,
  Scissors, Sparkles, Dumbbell, Wrench, MapPin, DollarSign, Percent, TrendingUp,
  Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, CloudFog, Loader2,
  Users, Calendar, Globe, Tag, Footprints, ShoppingBag, GraduationCap, Briefcase, HelpCircle
} from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

const getDistanceFromLatLonInMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);  
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
};

const TOTAL_STEPS = 6;

const businesses = [
  { label: 'Restaurant', icon: UtensilsCrossed },
  { label: 'Café', icon: Coffee },
  { label: 'Bakery', icon: CakeSlice },
  { label: 'Clothing / Boutique', icon: Shirt },
  { label: 'Convenience Store', icon: Store },
  { label: 'Specialty Retail', icon: Smartphone },
  { label: 'Hair Salon / Barber', icon: Scissors },
  { label: 'Nail Salon', icon: Sparkles },
  { label: 'Fitness Studio', icon: Dumbbell },
  { label: 'Service Business', icon: Wrench },
];

const businessModels = [
  { label: 'Walk-in heavy', desc: 'Most customers walk in without reservations' },
  { label: 'Mixed', desc: 'Select multiple — pick the ones that apply' },
  { label: 'Appointment-based', desc: 'Most customers book ahead of time' },
  { label: 'Online', desc: 'Most sales happen through delivery or online' },
];

const peakTrafficOptions = ['Morning', 'Lunch', 'Afternoon', 'Evening', 'Late night'];
const customerSourceOptions = [
  { label: 'Nearby schools', icon: GraduationCap },
  { label: 'Offices / workers', icon: Briefcase },
  { label: 'Shopping / mall traffic', icon: ShoppingBag },
  { label: 'Local neighborhood', icon: Footprints },
  { label: 'People who specifically travel here', icon: Globe },
  { label: 'Not sure', icon: HelpCircle },
];

const promotionOptions = [
  'Discounts (e.g., % off)',
  'Bundles (buy 1 get 1, combos)',
  'Limited-time offers',
  'Loyalty rewards',
  "I don't run promotions",
];

// US industry average statistics
const industryStats: Record<string, { revenue: string; margin: string }> = {
  'Restaurant': { revenue: '6027', margin: '4' },
  'Café': { revenue: '3397', margin: '14' },
  'Bakery': { revenue: '1096', margin: '15' },
  'Clothing / Boutique': { revenue: '734', margin: '4' },
  'Convenience Store': { revenue: '15068', margin: '2' },
  'Specialty Retail': { revenue: '1227', margin: '5.5' },
  'Hair Salon / Barber': { revenue: '879', margin: '10' },
  'Nail Salon': { revenue: '200', margin: '4.4' },
  'Fitness Studio': { revenue: '1192', margin: '15' },
  'Service Business': { revenue: '748', margin: '13' },
};

// WMO weather codes → icon + label
const getWeatherInfo = (code: number) => {
  if (code === 0 || code === 1) return { icon: Sun, label: 'Sunny', color: 'text-yellow-400' };
  if (code === 2) return { icon: Cloud, label: 'Partly Cloudy', color: 'text-gray-300' };
  if (code === 3) return { icon: Cloud, label: 'Cloudy', color: 'text-gray-400' };
  if (code >= 45 && code <= 48) return { icon: CloudFog, label: 'Foggy', color: 'text-gray-400' };
  if (code >= 51 && code <= 55) return { icon: CloudDrizzle, label: 'Drizzle', color: 'text-blue-300' };
  if (code >= 56 && code <= 57) return { icon: CloudDrizzle, label: 'Freezing Drizzle', color: 'text-blue-200' };
  if (code >= 61 && code <= 65) return { icon: CloudRain, label: 'Rain', color: 'text-blue-400' };
  if (code >= 66 && code <= 67) return { icon: CloudRain, label: 'Freezing Rain', color: 'text-blue-200' };
  if (code >= 71 && code <= 77) return { icon: CloudSnow, label: 'Snow', color: 'text-white' };
  if (code >= 80 && code <= 82) return { icon: CloudRain, label: 'Showers', color: 'text-blue-400' };
  if (code >= 85 && code <= 86) return { icon: CloudSnow, label: 'Snow Showers', color: 'text-white' };
  if (code >= 95 && code <= 99) return { icon: CloudLightning, label: 'Thunderstorm', color: 'text-purple-400' };
  return { icon: Cloud, label: 'Cloudy', color: 'text-gray-300' };
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeatherDay {
  date: string;
  dayName: string;
  tempHigh: number;
  tempLow: number;
  weatherCode: number;
  precipitation: number;
  snowfallCm: number;
  windspeedKmh: number;
}

export const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [displayedText, setDisplayedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);

  // Step 1
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  // Step 2
  const [address, setAddress] = useState('');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  // Step 3
  const [revenue, setRevenue] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  // Step 4
  const [businessModel, setBusinessModel] = useState<string | null>(null);
  const [mixedModels, setMixedModels] = useState<string[]>([]);
  // Step 5 (optional)
  const [peakTraffic, setPeakTraffic] = useState<string | null>(null);
  const [customerSource, setCustomerSource] = useState<string | null>(null);
  // Step 6
  const [promotionStyle, setPromotionStyle] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');

  // Weather (fetched on complete)
  const [weatherData, setWeatherData] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  
  const [anchors, setAnchors] = useState<TrafficAnchor[]>([]);
  const [anchorScore, setAnchorScore] = useState(0);

  const [showComplete, setShowComplete] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const fullText = 'Welcome to Cashcast, where you, out of millions of businesses, will stand out. To start, answer these questions.';

  // Typewriter effect for step 1
  useEffect(() => {
    if (step !== 1) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setTypingDone(true), 400);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Google Places Autocomplete for step 2
  useEffect(() => {
    if (step !== 2 || !addressInputRef.current) return;
    const initTimer = setTimeout(() => {
      if (!window.google?.maps?.places) return;
      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current!,
          { types: ['establishment', 'geocode'] }
        );
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place?.formatted_address) {
            setAddress(place.formatted_address);
            if (addressInputRef.current) addressInputRef.current.value = place.formatted_address;
          }
          if (place?.geometry?.location) {
            setLatLng({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
          }
        });
      } catch (err) {
        console.error('Google Places init error:', err);
      }
    }, 500);
    return () => clearTimeout(initTimer);
  }, [step]);

  // Weather fetch (kept for post-onboarding)
  const fetchWeather = async () => {
    if (!latLng) return;
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latLng.lat}&longitude=${latLng.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,snowfall_sum,windspeed_10m_max&temperature_unit=fahrenheit&windspeed_unit=kmh&timezone=auto&forecast_days=7`
      );
      if (!res.ok) throw new Error('Failed to fetch weather data');
      const data = await res.json();
      const days: WeatherDay[] = data.daily.time.map((date: string, i: number) => {
        const d = new Date(date + 'T00:00:00');
        return {
          date, dayName: dayNames[d.getDay()],
          tempHigh: Math.round(data.daily.temperature_2m_max[i]),
          tempLow: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weathercode[i],
          precipitation: Math.round(data.daily.precipitation_sum[i] * 100) / 100,
          snowfallCm: Math.round((data.daily.snowfall_sum?.[i] ?? 0) * 100) / 100,
          windspeedKmh: Math.round((data.daily.windspeed_10m_max?.[i] ?? 0) * 100) / 100,
        };
      });
      setWeatherData(days);
    } catch (err: any) {
      setWeatherError(err.message || 'Could not load weather');
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchAnchors = async () => {
    if (!latLng || !window.google?.maps?.places) return;
    return new Promise<void>(async (resolveFinal) => {
      try {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        const typesToSearch = [
          'school', 'university', 
          'transit_station', 'supermarket', 
          'hospital', 'movie_theater', 
          'stadium', 'church'
        ];
        const allResults: any[] = [];
        
        await Promise.all(
          typesToSearch.map(type => 
            new Promise<void>((resolve) => {
              service.nearbySearch(
                { location: latLng, radius: 2414, type }, // ~1.5 miles in meters
                (results: any[], status: string) => {
                  if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    results.forEach(r => {
                      if (r.geometry?.location) {
                        const dist = getDistanceFromLatLonInMiles(
                          latLng.lat, latLng.lng,
                          r.geometry.location.lat(), r.geometry.location.lng()
                        );
                        if (dist <= 1.5) {
                          allResults.push({ ...r, distance: dist, searchedType: type });
                        }
                      }
                    });
                  }
                  resolve();
                }
              );
            })
          )
        );
        
        // Deduplicate
        const unique = Array.from(new Map(allResults.map(r => [r.place_id, r])).values());
        
        // NOW fetch exact route distances using DistanceMatrixService
        const distanceService = new window.google.maps.DistanceMatrixService();
        const destinations = unique.map((u: any) => ({ placeId: u.place_id }));
        
        let exactDistances: Record<string, number> = {};
        
        if (destinations.length > 0) {
          try {
            const matrixRes = await new Promise<any>((resolve, reject) => {
              distanceService.getDistanceMatrix({
                origins: [latLng],
                destinations: destinations,
                travelMode: window.google.maps.TravelMode.DRIVING,
                unitSystem: window.google.maps.UnitSystem.IMPERIAL,
              }, (response: any, status: string) => {
                if (status === 'OK') resolve(response);
                else reject(status);
              });
            });
            
            if (matrixRes && matrixRes.rows && matrixRes.rows[0]) {
              const elements = matrixRes.rows[0].elements;
              unique.forEach((u: any, idx: number) => {
                const el = elements[idx];
                if (el.status === 'OK' && el.distance?.text) {
                  // e.g. "1.2 mi" -> 1.2
                  const miles = parseFloat(el.distance.text.replace(/[^0-9.]/g, ''));
                  if (!isNaN(miles)) {
                    exactDistances[u.place_id] = miles;
                  }
                }
              });
            }
          } catch (e) {
            console.error('DistanceMatrix failed, falling back to straight-line', e);
          }
        }
        
        // Filter and update unique list with exact distances if available
        const verifiedAnchors = unique.map((u: any) => {
          if (exactDistances[u.place_id] !== undefined) {
             u.distance = exactDistances[u.place_id];
          }
          return u;
        }).filter((u: any) => u.distance <= 2.0); // Slightly expanded strict radius to 2.0 mi since driving routes are longer than straight line.
        
        
        const isFood = selectedBusiness?.toLowerCase().includes('food') || selectedBusiness?.toLowerCase().includes('restaurant') || selectedBusiness?.toLowerCase().includes('café') || selectedBusiness?.toLowerCase().includes('bakery');
        const isRetail = selectedBusiness?.toLowerCase().includes('retail') || selectedBusiness?.toLowerCase().includes('clothing') || selectedBusiness?.toLowerCase().includes('convenience') || selectedBusiness?.toLowerCase().includes('store');
        
        let totalBaseScore = 0;
        const finalAnchors: TrafficAnchor[] = verifiedAnchors.map((r: any) => {
          let base = 0;
          if (r.distance <= 0.4) base = 35;
          else if (r.distance <= 0.8) base = 25;
          else if (r.distance <= 1.2) base = 15;
          else if (r.distance <= 1.5) base = 8;
          else base = 4;
          
          let multiplier = 1.0;
          if (r.searchedType === 'school' || r.searchedType === 'university') multiplier = 1.2; // Massive foot traffic drivers
          if (r.searchedType === 'transit_station') multiplier = 1.3;
          if (r.searchedType === 'hospital') multiplier = 1.1;
          
          const baseScore = Math.round(base * multiplier);
          totalBaseScore += baseScore;
          
          const prettyType = r.searchedType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          return {
            name: r.name,
            type: prettyType,
            rawType: r.searchedType,
            distance: Number(r.distance.toFixed(2)),
            baseScore: baseScore
          };
        }).sort((a, b) => b.baseScore - a.baseScore).slice(0, 8);
        
        setAnchors(finalAnchors);
        setAnchorScore(totalBaseScore);
      } catch (err) {
        console.error('Failed to fetch anchors', err);
      }
      resolveFinal();
    });
  };

  const completeSetup = async () => {
    setShowComplete(true);
    await Promise.all([fetchWeather(), fetchAnchors()]);
  };

  // Post-onboarding states
  const [thankYouText, setThankYouText] = useState('');
  const [thankYouDone, setThankYouDone] = useState(false);
  const [fadeOutText, setFadeOutText] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const thankYouFull = "Thank you — you're ready to transform your business.";

  // Smooth multi-phase transition
  useEffect(() => {
    if (!showComplete) return;

    // Phase 1: glass box fades out + video cross-fades to bg (handled by CSS)
    // Phase 2: after 1.5s, start typing
    const startTyping = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < thankYouFull.length) {
          setThankYouText(thankYouFull.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          // Phase 3: Pause, then fade out text
          setTimeout(() => setThankYouDone(true), 400);
          setTimeout(() => setFadeOutText(true), 1200);
          // Phase 4: Mount dashboard and animate it in
          setTimeout(() => setShowDashboard(true), 1800);
          setTimeout(() => setDashboardReady(true), 2000);
        }
      }, 40);
    }, 1800);

    return () => clearTimeout(startTyping);
  }, [showComplete]);

  // Shared styles
  const glassStyle = {
    background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.7) 0%, rgba(20, 20, 20, 0.6) 100%)',
    backdropFilter: 'blur(28px) saturate(1.6)',
    WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.04)',
  };

  const optionBtnStyle = (selected: boolean) => ({
    border: `1px solid ${selected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  });

  const stepIndicator = (activeStep: number) => (
    <div className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className={`w-8 h-1.5 rounded-full transition-all duration-500 ${s <= activeStep ? 'bg-white/70' : 'bg-white/15'}`} />
        ))}
      </div>
      <span className="text-white/40 text-sm font-geist">{activeStep} / {TOTAL_STEPS}</span>
    </div>
  );

  const navButtons = (back: () => void, next: () => void, canContinue: boolean, nextLabel = 'Continue') => (
    <div className="flex justify-between mt-10">
      <button
        onClick={back}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold font-geist transition-all duration-300 bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 cursor-pointer"
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <span className="text-xs">‹</span> Back
      </button>
      <button
        onClick={next}
        disabled={!canContinue}
        className={`flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold font-geist transition-all duration-300 ${
          canContinue
            ? 'bg-white/15 text-white border border-white/20 hover:bg-white/25 hover:scale-105 active:scale-95 cursor-pointer'
            : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
        }`}
        style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {nextLabel} <span className="text-xs">›</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* backgroundmain.png — fades in when onboarding completes */}
      <div
        className="absolute inset-0 z-[-1] transition-opacity ease-in-out"
        style={{
          backgroundImage: 'url(/onboarding2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: showComplete ? 1 : 0,
          transitionDuration: '2000ms',
        }}
      />

      {/* Onboarding video — fades out when complete */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity ease-in-out"
        style={{ opacity: showComplete ? 0 : 1, transitionDuration: '2000ms' }}
        src="/forsurefinal.mp4"
      />

      {/* Overlay — lightens during transition */}
      <div
        className="absolute inset-0 z-[1] transition-all ease-in-out"
        style={{
          backgroundColor: showComplete ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.30)',
          transitionDuration: '2000ms',
        }}
      />

      {/* Thank you typewriter — fades in then out */}
      {showComplete && (
        <div
          className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none transition-all ease-in-out"
          style={{
            opacity: fadeOutText ? 0 : (thankYouText.length > 0 ? 1 : 0),
            transform: fadeOutText ? 'scale(0.95) translateY(-30px)' : 'scale(1) translateY(0)',
            transitionDuration: '800ms',
          }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white text-center px-8 font-geist max-w-4xl leading-tight">
            {thankYouText}
            {!thankYouDone && thankYouText.length > 0 && (
              <span className="inline-block w-[3px] h-[1em] bg-white/80 ml-1 align-middle animate-pulse" />
            )}
          </h1>
        </div>
      )}

      {/* Dashboard — slides in after thank you fades */}
      {showDashboard && (
        <div
          className="absolute inset-0 z-[25] transition-all ease-out"
          style={{
            opacity: dashboardReady ? 1 : 0,
            transform: dashboardReady ? 'translateY(0)' : 'translateY(30px)',
            transitionDuration: '1000ms',
          }}
        >
            <Dashboard
              businessName={businessName}
              address={address}
              userLatLng={latLng}
              businessType={selectedBusiness || ''}
              revenue={revenue}
              profitMargin={profitMargin}
              businessModel={businessModel || ''}
              mixedModels={mixedModels}
              weatherData={weatherData}
              weatherLoading={weatherLoading}
              exposure={null}
              peakTraffic={peakTraffic}
              customerSource={customerSource}
              anchors={anchors}
              anchorScore={anchorScore}
            />
        </div>
      )}

      {/* All onboarding steps — fade out when complete */}
      <div
        className="relative z-10 flex flex-col items-center justify-center w-full transition-all ease-in-out"
        style={{
          opacity: showComplete ? 0 : 1,
          transform: showComplete ? 'scale(0.96) translateY(20px)' : 'scale(1) translateY(0)',
          transitionDuration: '800ms',
          pointerEvents: showComplete ? 'none' : 'auto',
        }}
      >

      {/* ===== STEP 1: Business Type ===== */}
      {step === 1 && (
        <div className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up" style={glassStyle}>
          {stepIndicator(1)}
          <div className="mb-10 font-geist">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug text-white">
              {displayedText}
              {!typingDone && <span className="inline-block w-[3px] h-[1em] bg-white/80 ml-1 align-middle animate-pulse" />}
            </h1>
          </div>
          <div className={`transition-all duration-700 ${typingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic">What type of business are you?</h2>
            <p className="text-white/50 text-base mb-8 font-geist">This helps us tailor insights to your industry.</p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {businesses.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setSelectedBusiness(label)}
                  className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-left text-base font-medium transition-all duration-300 cursor-pointer font-geist group
                    ${selectedBusiness === label
                      ? 'bg-white/15 text-white scale-[1.02] shadow-lg shadow-white/5'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.01]'
                    }`}
                  style={optionBtnStyle(selectedBusiness === label)}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${selectedBusiness === label ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => selectedBusiness && setStep(2)}
                disabled={!selectedBusiness}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold font-geist transition-all duration-300 ${selectedBusiness
                  ? 'bg-white/15 text-white border border-white/20 hover:bg-white/25 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                }`}
                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              >
                Continue <span className="text-xs">›</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Address ===== */}
      {step === 2 && (
        <div className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up" style={glassStyle}>
          {stepIndicator(2)}
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic">Where is your business located?</h2>
          <p className="text-white/50 text-base mb-8 font-geist">Start typing your address and select from the suggestions.</p>
          <div className="relative mb-2">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              ref={addressInputRef}
              type="text"
              placeholder="Search your business address..."
              onChange={(e) => setAddress(e.target.value)}
              className="w-full pl-12 pr-5 py-4 rounded-2xl text-base text-white placeholder-white/30 font-geist outline-none transition-all duration-300 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            />
          </div>
          {navButtons(
            () => setStep(1),
            () => { const val = addressInputRef.current?.value || address; if (val.trim()) { setAddress(val); setStep(3); } },
            !!(address.trim() || addressInputRef.current?.value?.trim())
          )}
        </div>
      )}

      {/* ===== STEP 3: Revenue & Profit Margin ===== */}
      {step === 3 && (
        <div className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up" style={glassStyle}>
          {stepIndicator(3)}
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic">Tell us about your numbers</h2>
          <p className="text-white/50 text-base mb-8 font-geist">This helps us build accurate revenue forecasts for your business.</p>

          {/* Auto-fill button */}
          {selectedBusiness && industryStats[selectedBusiness] && (
            <button
              onClick={() => {
                const stats = industryStats[selectedBusiness!];
                setRevenue(stats.revenue);
                setProfitMargin(stats.margin);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold font-geist mb-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <TrendingUp className="w-4 h-4 text-white/40" />
              Use average {selectedBusiness.toLowerCase()} statistics
            </button>
          )}

          <div className="mb-6">
            <label className="block text-white/70 text-sm font-semibold font-geist mb-2">Average Daily Revenue</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="text" inputMode="numeric" placeholder="e.g. 500" value={revenue}
                onChange={(e) => setRevenue(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full pl-12 pr-5 py-4 rounded-2xl text-base text-white placeholder-white/30 font-geist outline-none transition-all duration-300 focus:border-white/30"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              />
              {revenue && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-geist">${Number(revenue).toLocaleString()} / day</span>}
            </div>
          </div>
          <div className="mb-2">
            <label className="block text-white/70 text-sm font-semibold font-geist mb-2">Estimated Profit Margin</label>
            <div className="relative">
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input type="text" inputMode="numeric" placeholder="e.g. 15" value={profitMargin}
                onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ''); if (Number(val) <= 100 || val === '') setProfitMargin(val); }}
                className="w-full pl-12 pr-5 py-4 rounded-2xl text-base text-white placeholder-white/30 font-geist outline-none transition-all duration-300 focus:border-white/30"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              />
              {profitMargin && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-geist">{profitMargin}% margin</span>}
            </div>
          </div>
          {navButtons(() => setStep(2), () => { if (revenue.trim() && profitMargin.trim()) setStep(4); }, !!(revenue.trim() && profitMargin.trim()))}
        </div>
      )}

      {/* ===== STEP 4: Business Model Type ===== */}
      {step === 4 && (
        <div className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up" style={glassStyle}>
          {stepIndicator(4)}
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic">How do customers reach you?</h2>
          <p className="text-white/50 text-base mb-8 font-geist">This is critical for understanding how weather affects your business.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            {businessModels.map(({ label, desc }) => {
              const isMixedMode = businessModel === 'Mixed';
              const isSelected = label === 'Mixed'
                ? businessModel === 'Mixed'
                : isMixedMode
                  ? mixedModels.includes(label)
                  : businessModel === label;

              const handleClick = () => {
                if (label === 'Mixed') {
                  if (businessModel === 'Mixed') {
                    // Deselect mixed
                    setBusinessModel(null);
                    setMixedModels([]);
                  } else {
                    setBusinessModel('Mixed');
                    setMixedModels([]);
                  }
                } else if (isMixedMode) {
                  // Toggle sub-options in mixed mode
                  setMixedModels((prev) =>
                    prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
                  );
                } else {
                  // Single select for non-mixed
                  setBusinessModel(label);
                  setMixedModels([]);
                }
              };

              return (
                <button
                  key={label}
                  onClick={handleClick}
                  className={`flex flex-col gap-1 px-5 py-5 rounded-2xl text-left transition-all duration-300 cursor-pointer font-geist group
                    ${isSelected
                      ? 'bg-white/15 text-white scale-[1.02] shadow-lg shadow-white/5'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.01]'
                    }`}
                  style={optionBtnStyle(isSelected)}
                >
                  <span className="text-base font-semibold">{label}</span>
                  <span className={`text-sm ${isSelected ? 'text-white/60' : 'text-white/35'}`}>
                    {label === 'Mixed' && businessModel === 'Mixed'
                      ? 'Select which models apply below'
                      : desc}
                  </span>
                </button>
              );
            })}
          </div>

          {businessModel === 'Mixed' && mixedModels.length > 0 && (
            <p className="text-white/40 text-sm font-geist mt-3 mb-0">Selected: {mixedModels.join(', ')}</p>
          )}

          {navButtons(
            () => setStep(3),
            () => {
              const canContinue = businessModel === 'Mixed' ? mixedModels.length >= 2 : !!businessModel;
              if (canContinue) setStep(5);
            },
            businessModel === 'Mixed' ? mixedModels.length >= 2 : !!businessModel
          )}
        </div>
      )}

      {/* ===== STEP 5: Optional Insights (3 in 1) ===== */}
      {step === 5 && (
        <div className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-12 sm:px-16 sm:py-14 opacity-0 animate-fade-in-up overflow-y-auto max-h-[90vh]" style={glassStyle}>
          {stepIndicator(5)}
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white font-geist italic">A few more details</h2>
            <span className="text-xs text-white/30 border border-white/15 rounded-full px-2.5 py-0.5 font-geist">Optional</span>
          </div>
          <p className="text-white/50 text-base mb-8 font-geist">These are optional but help us give you more accurate forecasts.</p>

          {/* 5a: Peak Traffic Time */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-1 font-geist flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/50" /> When do you get the most customers?
            </h3>
            <p className="text-white/40 text-sm mb-3 font-geist">Weather only matters during your busiest hours.</p>
            <div className="flex flex-wrap gap-3">
              {peakTrafficOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPeakTraffic(opt)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer font-geist
                    ${peakTraffic === opt ? 'bg-white/15 text-white scale-[1.02]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                  style={optionBtnStyle(peakTraffic === opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 5c: Customer Source */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-white mb-1 font-geist flex items-center gap-2">
              <Users className="w-4 h-4 text-white/50" /> Where do most of your customers come from?
            </h3>
            <p className="text-white/40 text-sm mb-3 font-geist">Helps us weight traffic anchors near your business.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {customerSourceOptions.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setCustomerSource(label)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer font-geist group
                    ${customerSource === label
                      ? 'bg-white/15 text-white scale-[1.02]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  style={optionBtnStyle(customerSource === label)}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${customerSource === label ? 'text-white' : 'text-white/40'}`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {navButtons(() => setStep(4), () => setStep(6), true, 'Continue')}
        </div>
      )}

      {/* ===== STEP 6: Promotions ===== */}
      {step === 6 && (
        <div className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up" style={glassStyle}>
          {stepIndicator(6)}
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic flex items-center gap-3">
            <Tag className="w-7 h-7 text-white/50" /> What types of promotions work best for you?
          </h2>
          <p className="text-white/50 text-base mb-8 font-geist">This powers smart recommendations for slower days.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            {promotionOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setPromotionStyle(opt)}
                className={`px-5 py-4 rounded-2xl text-left text-base font-medium transition-all duration-300 cursor-pointer font-geist
                  ${promotionStyle === opt
                    ? 'bg-white/15 text-white scale-[1.02] shadow-lg shadow-white/5'
                    : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:scale-[1.01]'
                  }`}
                style={optionBtnStyle(promotionStyle === opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-2 font-geist flex items-center gap-2">
               What is the name of your business? <span className="text-xs text-white/30 border border-white/15 rounded-full px-2 py-0.5 ml-2 font-normal">Optional</span>
            </h3>
            <div className="relative">
              <input 
                type="text" 
                value={businessName} 
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. The Daily Grind"
                className="w-full px-5 py-4 rounded-2xl text-base text-white placeholder-white/30 font-geist outline-none transition-all duration-300 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              />
            </div>
          </div>
          {navButtons(
            () => setStep(5),
            () => { if (promotionStyle) { completeSetup(); } },
            !!promotionStyle,
            'Finish'
          )}
        </div>
      )}
      </div>
    </div>
  );
};
