import { useEffect, useState } from 'react';
import { Calendar, X, DollarSign, Sparkles, Loader2 } from 'lucide-react';

type WeeklyCheckinProps = {
  businessType: string;
  lat: number;
  lng: number;
  baselineRevenue: number;
  schoolDependent: boolean;
  onSubmitted?: () => void;
};

type NeedsPromptResponse = {
  businessId: string;
  needsPrompt: boolean;
  lastWeekDates: { date: string; label: string }[];
  totalCorrections: number;
};

const parseMoney = (text: string): number | null => {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const WeeklyCheckin = ({
  businessType,
  lat,
  lng,
  baselineRevenue,
  schoolDependent,
  onSubmitted,
}: WeeklyCheckinProps) => {
  const [status, setStatus] = useState<NeedsPromptResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [actuals, setActuals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      businessType,
      lat: String(lat),
      lng: String(lng),
    });
    fetch(`/api/correction/needs-prompt?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((data: NeedsPromptResponse) => {
        if (cancelled) return;
        setStatus(data);
        setActuals(Array(data.lastWeekDates.length).fill(''));
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessType, lat, lng]);

  if (statusLoading || dismissed || !status || !status.needsPrompt) {
    return null;
  }

  const filledCount = actuals.filter((v) => parseMoney(v) !== null).length;

  const handleSubmit = async () => {
    setError('');
    if (filledCount === 0) {
      setError('Add at least one day, or hit dismiss to do this later.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/onboarding/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          lat,
          lng,
          baselineRevenue,
          schoolDependent,
          actuals: status.lastWeekDates.map((d, i) => ({
            date: d.date,
            revenue: parseMoney(actuals[i]),
          })),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Submit failed (${response.status})`);
      }
      const data = await response.json() as { message: string; correctionsCount: number };
      setSuccess(data.message);
      onSubmitted?.();
      setTimeout(() => {
        setDismissed(true);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-2xl px-6 py-5 mb-6 border border-emerald-400/20"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.10) 0%, rgba(8, 8, 8, 0.85) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-400/15 mt-0.5">
            <Calendar className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-white text-base font-semibold font-geist">
              How did last week go?
            </p>
            <p className="text-white/50 text-sm font-geist mt-0.5">
              {success
                ? success
                : 'Tell Kastly what you actually made each day — we\'ll sharpen this week\'s forecasts.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!expanded && !success && (
            <button
              onClick={() => setExpanded(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold font-geist bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-400/30 hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              Tell Kastly
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/5 transition-all duration-200 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && !success && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {status.lastWeekDates.map((day, i) => (
              <div key={day.date} className="flex flex-col gap-1.5">
                <label className="text-white/50 text-xs font-geist">{day.label}</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={actuals[i]}
                    placeholder="—"
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d.]/g, '');
                      const next = actuals.slice();
                      next[i] = cleaned;
                      setActuals(next);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 font-geist outline-none transition-all duration-200 focus:border-emerald-400/40"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-red-400/90 text-sm font-geist mb-3">{error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-white/40 text-xs font-geist">
              {filledCount === 0
                ? 'Skip any day you were closed.'
                : `${filledCount} day${filledCount > 1 ? 's' : ''} ready.`}
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting || filledCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold font-geist transition-all duration-200 bg-emerald-400/25 text-emerald-100 border border-emerald-400/40 hover:bg-emerald-400/35 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Calibrating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Update forecast
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
