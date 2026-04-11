import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  calculateScenarioOutcome,
  type DemoDashboardData,
  type RiskLevel,
} from '../data/demoData'

type DashboardProps = {
  data: DemoDashboardData
  onRestart: () => void
}

function riskClassName(riskLevel: RiskLevel): string {
  if (riskLevel === 'Critical') return 'risk-critical'
  if (riskLevel === 'High') return 'risk-high'
  if (riskLevel === 'Moderate') return 'risk-moderate'
  return 'risk-low'
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function heatColor(value: number): string {
  if (value >= 85) return '#e85b6d'
  if (value >= 70) return '#c7445d'
  if (value >= 55) return '#9a334f'
  if (value >= 40) return '#6b263f'
  return '#321a2b'
}

export default function Dashboard({ data, onRestart }: DashboardProps) {
  const [activeScenario, setActiveScenario] = useState(data.scenarios[0]?.id ?? '')

  const selectedScenario = useMemo(() => {
    return data.scenarios.find((scenario) => scenario.id === activeScenario) ?? data.scenarios[0]
  }, [activeScenario, data.scenarios])

  const scenarioOutcome = useMemo(() => {
    if (!selectedScenario) return { projectedRevenueChange: 0, payoffScore: 0 }
    return calculateScenarioOutcome(selectedScenario, data.revenueImpact, data.marketContext)
  }, [data.marketContext, data.revenueImpact, selectedScenario])

  const gaugeStart = -210
  const gaugeSweep = 240
  const gaugeEnd = gaugeStart + gaugeSweep
  const gaugeValueEnd = gaugeStart + (data.stability.score / 100) * gaugeSweep

  return (
    <section className="dashboard-shell">
      <header className="dash-header card-elevated">
        <div>
          <p className="mono-kicker">LIVE OPERATIONS DASHBOARD</p>
          <h2>{data.businessName} pulse in {data.zipCode}</h2>
          <p>Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onRestart}>
          New simulation
        </button>
      </header>

      <section className="ticker-wrap">
        <div className="ticker-track">
          {[...data.liveSignals, ...data.liveSignals].map((signal, index) => (
            <span key={`${signal.id}-${index}`} className={`ticker-item ${signal.direction}`}>
              <strong>{signal.label}</strong>
              <em>{signal.value}</em>
              <i>{signal.delta > 0 ? '+' : ''}{signal.delta}%</i>
            </span>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <article className="dash-card impact-card">
          <div className="card-title-row">
            <h3>Revenue impact</h3>
            <span className={`risk-pill ${riskClassName(data.revenueImpact.riskLevel)}`}>
              {data.revenueImpact.riskLevel} risk
            </span>
          </div>
          <p className="impact-value">
            {data.revenueImpact.projectedChangePercent > 0 ? '+' : ''}
            {data.revenueImpact.projectedChangePercent}%
          </p>
          <p className="muted">Confidence {data.revenueImpact.confidence}%</p>
          <ul>
            {data.revenueImpact.drivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </article>

        <article className="dash-card stability-card">
          <h3>Stability score</h3>
          <svg viewBox="0 0 160 110" aria-label="Stability score gauge">
            <path d={describeArc(80, 90, 62, gaugeStart, gaugeEnd)} className="gauge-bg" />
            <path d={describeArc(80, 90, 62, gaugeStart, gaugeValueEnd)} className="gauge-value" />
            <text x="80" y="72" textAnchor="middle" className="gauge-score">
              {data.stability.score}
            </text>
            <text x="80" y="92" textAnchor="middle" className="gauge-caption">
              stability
            </text>
          </svg>
          <div className="stability-meta">
            <span>Momentum: {data.stability.momentum > 0 ? '+' : ''}{data.stability.momentum}</span>
            <span>Volatility: {data.stability.volatility}</span>
          </div>
        </article>

        <article className="dash-card ai-card">
          <h3>AI insight</h3>
          <strong>{data.aiInsight.title}</strong>
          <p>{data.aiInsight.summary}</p>
          <ul>
            {data.aiInsight.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </article>

        <article className="dash-card market-card">
          <h3>Market context</h3>
          <div className="market-grid">
            <div>
              <span>Competitors</span>
              <strong>{data.marketContext.competitors}</strong>
            </div>
            <div>
              <span>Market share</span>
              <strong>{data.marketContext.marketShare}%</strong>
            </div>
            <div>
              <span>Competitive index</span>
              <strong>{data.marketContext.competitiveIndex}</strong>
            </div>
            <div>
              <span>Nearby avg ticket</span>
              <strong>{formatMoney(data.marketContext.avgTicketNearby)}</strong>
            </div>
          </div>
        </article>

        <article className="dash-card chart-card">
          <div className="card-title-row">
            <h3>7-day forecast</h3>
            <span className="legend-pill">Baseline vs forecast</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.58)" />
              <YAxis yAxisId="money" stroke="rgba(255,255,255,0.58)" />
              <YAxis yAxisId="index" orientation="right" stroke="rgba(255,255,255,0.35)" />
              <Tooltip
                contentStyle={{
                  background: '#0f1526',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                }}
              />
              <Area
                yAxisId="money"
                dataKey="baseline"
                stroke="#7a8fb7"
                fill="rgba(122,143,183,0.2)"
                strokeWidth={1.5}
              />
              <Bar yAxisId="money" dataKey="baseline" fill="rgba(132, 148, 178, 0.35)" radius={8} />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="forecast"
                stroke="#d94b5f"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="index"
                type="monotone"
                dataKey="demandIndex"
                stroke="#79cf9f"
                strokeDasharray="5 4"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </article>

        <article className="dash-card heatmap-card">
          <div className="card-title-row">
            <h3>City demand heatmap</h3>
            <span className="legend-pill">48 zones</span>
          </div>
          <svg viewBox="0 0 400 240" aria-label="Demand heatmap">
            {data.heatmap.map((cell) => (
              <g key={cell.zone}>
                <rect
                  x={cell.col * 48 + 8}
                  y={cell.row * 38 + 8}
                  width="42"
                  height="32"
                  rx="6"
                  fill={heatColor(cell.demand)}
                />
                <text x={cell.col * 48 + 29} y={cell.row * 38 + 28} textAnchor="middle" className="heat-value">
                  {cell.demand}
                </text>
              </g>
            ))}
          </svg>
        </article>

        <article className="dash-card events-card">
          <h3>Event intelligence</h3>
          <div className="event-list">
            {data.events.map((event) => (
              <div key={event.id} className="event-card">
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.category.toUpperCase()} · ETA {event.eta}</span>
                </div>
                <div className={event.impact >= 0 ? 'impact-up' : 'impact-down'}>
                  {event.impact >= 0 ? '+' : ''}
                  {event.impact}%
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dash-card scenario-card">
          <h3>Scenario simulation</h3>
          <div className="scenario-list">
            {data.scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className={scenario.id === selectedScenario?.id ? 'scenario-item active' : 'scenario-item'}
                onClick={() => setActiveScenario(scenario.id)}
              >
                <strong>{scenario.shortLabel}</strong>
                <span>{scenario.liftPercent}% est. lift</span>
              </button>
            ))}
          </div>

          {selectedScenario ? (
            <div className="scenario-detail">
              <h4>{selectedScenario.name}</h4>
              <p>{selectedScenario.description}</p>
              <div className="scenario-metrics">
                <span>Cost: {formatMoney(selectedScenario.cost)}</span>
                <span>Confidence: {selectedScenario.confidence}%</span>
                <span>
                  Projected net: {scenarioOutcome.projectedRevenueChange > 0 ? '+' : ''}
                  {scenarioOutcome.projectedRevenueChange}%
                </span>
                <span>Payoff score: {scenarioOutcome.payoffScore}</span>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  )
}
