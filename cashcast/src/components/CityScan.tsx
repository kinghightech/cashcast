import { useEffect, useMemo, useState } from 'react'

type CityScanProps = {
  zipCode: string
  onComplete: () => void
}

type ScanPoint = {
  id: string
  x: number
  y: number
  strength: number
}

const scanStages = [
  'Weather',
  'Traffic',
  'Events',
  'Sports',
  'Holidays',
  'Commute',
  'Economic',
  'Community',
  'Risk',
]

function seededPoints(seed: string): ScanPoint[] {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index)
    hash |= 0
  }

  const random = () => {
    hash = (hash * 1664525 + 1013904223) % 4294967296
    return Math.abs(hash) / 4294967296
  }

  return Array.from({ length: 30 }).map((_, index) => ({
    id: `pt-${index}`,
    x: 6 + random() * 88,
    y: 6 + random() * 88,
    strength: 32 + random() * 68,
  }))
}

export default function CityScan({ zipCode, onComplete }: CityScanProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 1 + Math.random() * 3.5, 100)
        if (next >= 100) {
          window.clearInterval(interval)
          window.setTimeout(onComplete, 450)
        }
        return next
      })
    }, 120)

    return () => window.clearInterval(interval)
  }, [onComplete])

  const stageIndex = Math.min(
    scanStages.length - 1,
    Math.floor((progress / 100) * scanStages.length),
  )
  const activeStage = scanStages[stageIndex]

  const points = useMemo(() => seededPoints(zipCode), [zipCode])
  const lines = useMemo(() => {
    const connected: Array<[ScanPoint, ScanPoint]> = []
    for (let i = 0; i < points.length - 1; i += 3) {
      connected.push([points[i], points[(i + 2) % points.length]])
    }
    return connected
  }, [points])

  return (
    <section className="stage-panel scan-stage card-elevated">
      <div className="stage-head">
        <p className="mono-kicker">CITY INTELLIGENCE SCAN</p>
        <h2>Mapping live signal layers in {zipCode}</h2>
        <p>
          Fusing environmental, behavioral, and economic patterns into a single operational risk
          map.
        </p>
      </div>

      <div className="scan-layout">
        <div className="scan-map-wrap">
          <svg viewBox="0 0 100 100" role="img" aria-label="Animated city scan map">
            <rect x="0" y="0" width="100" height="100" rx="2" className="scan-bg" />

            {lines.map(([from, to]) => (
              <line
                key={`${from.id}-${to.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="scan-link"
              />
            ))}

            {points.map((point) => (
              <circle
                key={point.id}
                cx={point.x}
                cy={point.y}
                r={point.strength > 75 ? 1.9 : 1.35}
                className="scan-point"
                style={{ opacity: 0.4 + point.strength / 160 }}
              />
            ))}

            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              className="scan-sweep"
              style={{ transform: `translateY(${96 - progress}%)` }}
            />
          </svg>
          <div className="scan-line" />
        </div>

        <aside className="scan-sidebar">
          <div className="scan-stage-list">
            {scanStages.map((stage, index) => {
              const state = index < stageIndex ? 'done' : index === stageIndex ? 'active' : 'idle'
              return (
                <div key={stage} className={`scan-stage-item ${state}`}>
                  <span>{stage}</span>
                  <em>{state === 'done' ? 'DONE' : state === 'active' ? 'SCANNING' : 'WAITING'}</em>
                </div>
              )
            })}
          </div>

          <div className="scan-progress-wrap">
            <div className="scan-progress-head">
              <strong>{activeStage}</strong>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="scan-progress-bar">
              <div className="scan-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
