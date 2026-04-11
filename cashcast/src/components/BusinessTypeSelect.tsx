import { useAppContext, type SensitivityProfile } from '../context/AppContext'

type BusinessTypeSelectProps = {
  onContinue: () => void
}

const metricLabels: Array<[keyof SensitivityProfile, string]> = [
  ['weather', 'Weather'],
  ['events', 'Events'],
  ['traffic', 'Traffic'],
  ['sports', 'Sports'],
  ['economic', 'Economic'],
  ['seasonal', 'Seasonal'],
]

export default function BusinessTypeSelect({ onContinue }: BusinessTypeSelectProps) {
  const {
    businessTypes,
    selectedBusinessTypeId,
    selectedBusinessType,
    setSelectedBusinessTypeId,
  } = useAppContext()

  return (
    <section className="stage-panel business-stage card-elevated">
      <div className="stage-head">
        <p className="mono-kicker">SENSITIVITY PROFILE</p>
        <h2>Select business type</h2>
        <p>
          Each type has a six-factor sensitivity model that influences forecast volatility and
          scenario outcomes.
        </p>
      </div>

      <div className="business-grid">
        {businessTypes.map((businessType) => {
          const active = businessType.id === selectedBusinessTypeId

          return (
            <button
              key={businessType.id}
              type="button"
              className={active ? 'business-card active' : 'business-card'}
              onClick={() => setSelectedBusinessTypeId(businessType.id)}
            >
              <strong>{businessType.name}</strong>
              <span>{businessType.description}</span>
            </button>
          )
        })}
      </div>

      <article className="sensitivity-card">
        <h3>{selectedBusinessType.name} sensitivity profile</h3>
        <div className="sensitivity-bars">
          {metricLabels.map(([key, label]) => {
            const value = selectedBusinessType.sensitivity[key]
            return (
              <div key={key} className="sensitivity-row">
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="bar-shell">
                  <div className="bar-fill glow-crimson" style={{ width: `${value}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </article>

      <div className="stage-actions">
        <button type="button" className="primary-button" onClick={onContinue}>
          Start city scan
        </button>
      </div>
    </section>
  )
}
