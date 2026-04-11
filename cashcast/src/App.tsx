import { useCallback, useMemo, useState } from 'react'
import './App.css'
import BusinessTypeSelect from './components/BusinessTypeSelect'
import CityScan from './components/CityScan'
import Dashboard from './components/Dashboard'
import VaultIntro from './components/VaultIntro'
import ZipCodeInput from './components/ZipCodeInput'
import { AppProvider, useAppContext } from './context/AppContext'
import { buildDemoDashboardData, type DemoDashboardData } from './data/demoData'

type FlowStage = 'vault' | 'zip' | 'business' | 'scan' | 'dashboard'

function AppFlow() {
  const { selectedBusinessType, zipCode, setZipCode } = useAppContext()
  const [stage, setStage] = useState<FlowStage>('vault')
  const [dashboardData, setDashboardData] = useState<DemoDashboardData | null>(null)

  const createDashboard = useCallback(() => {
    const snapshot = buildDemoDashboardData(zipCode, selectedBusinessType)
    setDashboardData(snapshot)
    setStage('dashboard')
  }, [selectedBusinessType, zipCode])

  const stageLabel = useMemo(() => {
    if (stage === 'vault') return 'Intro'
    if (stage === 'zip') return 'Zip'
    if (stage === 'business') return 'Type'
    if (stage === 'scan') return 'Scan'
    return 'Dashboard'
  }, [stage])

  return (
    <main className="app-root">
      <div className="ambient-backdrop" aria-hidden="true" />
      <div className="grid-overlay" aria-hidden="true" />

      <header className="app-header">
        <div>
          <p className="mono-kicker">Predictive Operations Console</p>
          <h1 className="text-gradient-crimson">CashCast</h1>
          <p className="subtle-copy">
            From dark vault reveal to citywide analytics: a cinematic setup that lands in an
            actionable revenue dashboard.
          </p>
        </div>
        <span className="stage-chip">Stage: {stageLabel}</span>
      </header>

      {stage === 'vault' ? <VaultIntro onComplete={() => setStage('zip')} /> : null}

      {stage === 'zip' ? (
        <ZipCodeInput
          initialValue={zipCode}
          onSubmit={(nextZip) => {
            setZipCode(nextZip)
            setStage('business')
          }}
        />
      ) : null}

      {stage === 'business' ? <BusinessTypeSelect onContinue={() => setStage('scan')} /> : null}

      {stage === 'scan' ? <CityScan zipCode={zipCode} onComplete={createDashboard} /> : null}

      {stage === 'dashboard' && dashboardData ? (
        <Dashboard
          data={dashboardData}
          onRestart={() => {
            setDashboardData(null)
            setStage('zip')
          }}
        />
      ) : null}
    </main>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppFlow />
    </AppProvider>
  )
}
