import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type SensitivityProfile = {
  weather: number
  events: number
  traffic: number
  sports: number
  economic: number
  seasonal: number
}

export type BusinessTypeProfile = {
  id: string
  name: string
  description: string
  sensitivity: SensitivityProfile
}

type AppContextValue = {
  businessTypes: BusinessTypeProfile[]
  selectedBusinessTypeId: string
  selectedBusinessType: BusinessTypeProfile
  setSelectedBusinessTypeId: (id: string) => void
  zipCode: string
  setZipCode: (zip: string) => void
}

const businessTypes: BusinessTypeProfile[] = [
  {
    id: 'coffee-shop',
    name: 'Coffee Shop',
    description: 'Morning rush and commuter behavior heavily shape demand.',
    sensitivity: { weather: 68, events: 44, traffic: 81, sports: 26, economic: 52, seasonal: 60 },
  },
  {
    id: 'grocery',
    name: 'Grocery',
    description: 'Steady baseline with spikes before storms and holidays.',
    sensitivity: { weather: 58, events: 30, traffic: 49, sports: 18, economic: 65, seasonal: 72 },
  },
  {
    id: 'gas-station',
    name: 'Gas Station',
    description: 'Commute patterns and weather warnings are major drivers.',
    sensitivity: { weather: 71, events: 24, traffic: 79, sports: 16, economic: 73, seasonal: 38 },
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Events and weekend behavior create large demand swings.',
    sensitivity: { weather: 54, events: 82, traffic: 56, sports: 63, economic: 58, seasonal: 49 },
  },
  {
    id: 'retail',
    name: 'Retail',
    description: 'Weather comfort and local promotions strongly affect traffic.',
    sensitivity: { weather: 62, events: 61, traffic: 64, sports: 21, economic: 66, seasonal: 74 },
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'More resilient demand with modest event influence.',
    sensitivity: { weather: 41, events: 22, traffic: 53, sports: 10, economic: 61, seasonal: 47 },
  },
  {
    id: 'gym',
    name: 'Gym',
    description: 'Weather and seasonal motivation trends shape attendance.',
    sensitivity: { weather: 64, events: 28, traffic: 42, sports: 47, economic: 57, seasonal: 83 },
  },
  {
    id: 'convenience-store',
    name: 'Convenience Store',
    description: 'Late-hour availability and neighborhood movement matter most.',
    sensitivity: { weather: 55, events: 35, traffic: 70, sports: 29, economic: 48, seasonal: 43 },
  },
  {
    id: 'bar',
    name: 'Bar',
    description: 'Events, nightlife, and sports outcomes drive volume.',
    sensitivity: { weather: 46, events: 84, traffic: 39, sports: 86, economic: 54, seasonal: 58 },
  },
  {
    id: 'salon',
    name: 'Salon',
    description: 'Appointment rhythm plus weather comfort shape no-shows.',
    sensitivity: { weather: 57, events: 26, traffic: 46, sports: 12, economic: 69, seasonal: 64 },
  },
]

const AppContext = createContext<AppContextValue | null>(null)

type AppProviderProps = {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [selectedBusinessTypeId, setSelectedBusinessTypeId] = useState('coffee-shop')
  const [zipCode, setZipCode] = useState('02101')

  const selectedBusinessType = useMemo(() => {
    return businessTypes.find((type) => type.id === selectedBusinessTypeId) ?? businessTypes[0]
  }, [selectedBusinessTypeId])

  const value = useMemo<AppContextValue>(
    () => ({
      businessTypes,
      selectedBusinessTypeId,
      selectedBusinessType,
      setSelectedBusinessTypeId,
      zipCode,
      setZipCode,
    }),
    [selectedBusinessType, selectedBusinessTypeId, zipCode],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const value = useContext(AppContext)
  if (!value) {
    throw new Error('useAppContext must be used inside AppProvider')
  }
  return value
}
