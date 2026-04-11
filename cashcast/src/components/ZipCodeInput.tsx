import { useMemo, useState } from 'react'

type ZipCodeInputProps = {
  initialValue: string
  onSubmit: (zip: string) => void
}

const demoSuggestions = ['02101', '10001', '90210', '60601', '01545']

export default function ZipCodeInput({ initialValue, onSubmit }: ZipCodeInputProps) {
  const [zip, setZip] = useState(initialValue)
  const [touched, setTouched] = useState(false)

  const isValid = useMemo(() => /^\d{5}$/.test(zip), [zip])

  return (
    <section className="stage-panel zip-stage card-elevated">
      <div className="stage-head">
        <p className="mono-kicker">LOCATION LOCK</p>
        <h2>Enter your ZIP code</h2>
        <p>We use your ZIP as the anchor for weather, event flow, and neighborhood demand signals.</p>
      </div>

      <form
        className="zip-form"
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (!isValid) return
          onSubmit(zip)
        }}
      >
        <label htmlFor="zip-input">ZIP code</label>
        <div className={`zip-input-row ${isValid ? 'valid' : touched ? 'invalid' : ''}`}>
          <span className="zip-pin" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
          </span>

          <input
            id="zip-input"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, '').slice(0, 5)
              setZip(value)
            }}
            placeholder="02101"
            aria-invalid={touched && !isValid}
          />
        </div>

        {!isValid && touched ? (
          <p className="field-error">ZIP must be exactly 5 digits.</p>
        ) : (
          <p className="field-help">Try a demo ZIP to preview different city profiles.</p>
        )}

        <div className="zip-suggestions">
          {demoSuggestions.map((value) => (
            <button type="button" key={value} onClick={() => setZip(value)}>
              {value}
            </button>
          ))}
        </div>

        <button type="submit" className="primary-button zip-submit" disabled={!isValid}>
          Continue to business profile
        </button>
      </form>
    </section>
  )
}
