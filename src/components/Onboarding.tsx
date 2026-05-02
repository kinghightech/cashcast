import { useEffect, useRef, useState } from 'react';
import { MapPin, Percent, TrendingUp } from 'lucide-react';
import { Dashboard, TrafficAnchor } from './Dashboard';

declare global {
  interface Window {
    google: any;
  }
}

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

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDistanceFromLatLonInMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState('');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [revenue, setRevenue] = useState('0');
  const [profitMargin, setProfitMargin] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  const [weatherData, setWeatherData] = useState<WeatherDay[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [anchors, setAnchors] = useState<TrafficAnchor[]>([]);
  const [anchorScore, setAnchorScore] = useState(0);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (step !== 1 || !addressInputRef.current) return;
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
    }, 300);
    return () => clearTimeout(initTimer);
  }, [step]);

  const fetchWeather = async () => {
    if (!latLng) return;
    setWeatherLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latLng.lat}&longitude=${latLng.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,snowfall_sum,windspeed_10m_max&temperature_unit=fahrenheit&windspeed_unit=kmh&timezone=auto&forecast_days=7`
      );
      if (!res.ok) throw new Error('Failed to fetch weather data');
      const data = await res.json();
      const days: WeatherDay[] = data.daily.time.map((date: string, i: number) => {
        const d = new Date(date + 'T00:00:00');
        return {
          date,
          dayName: dayNames[d.getDay()],
          tempHigh: Math.round(data.daily.temperature_2m_max[i]),
          tempLow: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weathercode[i],
          precipitation: Math.round(data.daily.precipitation_sum[i] * 100) / 100,
          snowfallCm: Math.round((data.daily.snowfall_sum?.[i] ?? 0) * 100) / 100,
          windspeedKmh: Math.round((data.daily.windspeed_10m_max?.[i] ?? 0) * 100) / 100,
        };
      });
      setWeatherData(days);
    } catch (err) {
      console.error(err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchAnchors = async () => {
    if (!latLng || !window.google?.maps?.places) return;
    return new Promise<void>(async (resolveFinal) => {
      try {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        const typesToSearch = ['school', 'university', 'transit_station', 'supermarket', 'hospital', 'movie_theater', 'stadium', 'church'];
        const allResults: any[] = [];

        await Promise.all(
          typesToSearch.map((type) =>
            new Promise<void>((resolve) => {
              service.nearbySearch(
                { location: latLng, radius: 2414, type },
                (results: any[], status: string) => {
                  if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    results.forEach((r) => {
                      if (r.geometry?.location) {
                        const dist = getDistanceFromLatLonInMiles(
                          latLng.lat,
                          latLng.lng,
                          r.geometry.location.lat(),
                          r.geometry.location.lng()
                        );
                        if (dist <= 1.5) allResults.push({ ...r, distance: dist, searchedType: type });
                      }
                    });
                  }
                  resolve();
                }
              );
            })
          )
        );

        const unique = Array.from(new Map(allResults.map((r) => [r.place_id, r])).values());
        const finalAnchors: TrafficAnchor[] = unique
          .map((r: any) => {
            let base = 4;
            if (r.distance <= 0.4) base = 35;
            else if (r.distance <= 0.8) base = 25;
            else if (r.distance <= 1.2) base = 15;
            else if (r.distance <= 1.5) base = 8;

            const prettyType = r.searchedType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            return {
              name: r.name,
              type: prettyType,
              rawType: r.searchedType,
              distance: Number(r.distance.toFixed(2)),
              baseScore: base,
            };
          })
          .sort((a, b) => b.baseScore - a.baseScore)
          .slice(0, 8);

        setAnchors(finalAnchors);
        setAnchorScore(finalAnchors.reduce((sum, a) => sum + a.baseScore, 0));
      } catch (err) {
        console.error('Failed to fetch anchors', err);
      }
      resolveFinal();
    });
  };

  const completeSetup = async () => {
    await Promise.all([fetchWeather(), fetchAnchors()]);
    setShowDashboard(true);
  };

  if (showDashboard) {
    return (
      <Dashboard
        businessName=""
        address={address}
        userLatLng={latLng}
        businessType="Service Business"
        revenue={revenue}
        profitMargin={profitMargin}
        businessModel="Walk-in heavy"
        mixedModels={[]}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        exposure={null}
        peakTraffic={null}
        customerSource={null}
        anchors={anchors}
        anchorScore={anchorScore}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(155deg, #060b1b 0%, #08112c 38%, #05060a 100%)' }}
    >
      <div className="absolute inset-0 z-[1] bg-black/25" />
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        {step === 1 && (
          <div
            className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.7) 0%, rgba(20, 20, 20, 0.6) 100%)',
              backdropFilter: 'blur(28px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1.5 rounded-full bg-white/70" />
                <div className="w-8 h-1.5 rounded-full bg-white/15" />
              </div>
              <span className="text-white/40 text-sm font-geist">1 / 2</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic">Where is your business located?</h2>
            <p className="text-white/50 text-base mb-8 font-geist">Enter your business location to personalize your dashboard.</p>
            <div className="relative mb-2">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref={addressInputRef}
                type="text"
                placeholder="Search your business address..."
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl text-base text-white placeholder-white/30 font-geist outline-none transition-all duration-300 focus:border-white/30"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              />
            </div>
            <div className="flex justify-end mt-10">
              <button
                onClick={() => {
                  const val = addressInputRef.current?.value || address;
                  if (val.trim()) {
                    setAddress(val);
                    setStep(2);
                  }
                }}
                disabled={!(address.trim() || addressInputRef.current?.value?.trim())}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold font-geist transition-all duration-300 bg-white/15 text-white border border-white/20 hover:bg-white/25"
              >
                Continue <span className="text-xs">›</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div
            className="relative z-10 w-[94%] max-w-5xl rounded-3xl px-12 py-14 sm:px-16 sm:py-16 opacity-0 animate-fade-in-up"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.7) 0%, rgba(20, 20, 20, 0.6) 100%)',
              backdropFilter: 'blur(28px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1.5 rounded-full bg-white/70" />
                <div className="w-8 h-1.5 rounded-full bg-white/70" />
              </div>
              <span className="text-white/40 text-sm font-geist">2 / 2</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 font-geist italic">What is your profit margin?</h2>
            <p className="text-white/50 text-base mb-8 font-geist">Only profit is needed right now. You can update other details later.</p>

            <button
              onClick={() => setProfitMargin('13')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold font-geist mb-8 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}
            >
              <TrendingUp className="w-4 h-4 text-white/40" />
              Use a typical small-business margin
            </button>

            <div className="mb-2">
              <label className="block text-white/70 text-sm font-semibold font-geist mb-2">Estimated Profit Margin</label>
              <div className="relative">
                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 15"
                  value={profitMargin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if (Number(val) <= 100 || val === '') setProfitMargin(val);
                  }}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl text-base text-white placeholder-white/30 font-geist outline-none transition-all duration-300 focus:border-white/30"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
                {profitMargin && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-geist">{profitMargin}%</span>}
              </div>
            </div>

            <div className="flex justify-between mt-10">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold font-geist transition-all duration-300 bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
              >
                <span className="text-xs">‹</span> Back
              </button>
              <button
                onClick={() => {
                  if (profitMargin.trim()) completeSetup();
                }}
                disabled={!profitMargin.trim()}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold font-geist transition-all duration-300 bg-white/15 text-white border border-white/20 hover:bg-white/25 disabled:opacity-40"
              >
                Finish <span className="text-xs">›</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
