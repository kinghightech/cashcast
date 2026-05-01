// Tiny JSON-file store for correction ratios.
//
// Keyed by businessId (e.g. "coffee-shop-02101"). One row per (businessId, weekDate).
// Stand-in for the Supabase `corrections` table the spec describes — same shape,
// same access pattern, so swapping in a real DB later is a one-file change.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type CorrectionRow = {
  businessId: string
  weekDate: string // YYYY-MM-DD
  predicted: number
  actual: number
  correctionRatio: number
  createdAt: string // ISO
}

const STORE_DIR = path.resolve(process.cwd(), 'store', 'data')
const STORE_FILE = path.join(STORE_DIR, 'corrections.json')

async function ensureStore(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true })
  try {
    await fs.access(STORE_FILE)
  } catch {
    await fs.writeFile(STORE_FILE, '[]', 'utf8')
  }
}

async function readAll(): Promise<CorrectionRow[]> {
  await ensureStore()
  const raw = await fs.readFile(STORE_FILE, 'utf8')
  try {
    const parsed = JSON.parse(raw) as CorrectionRow[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(rows: CorrectionRow[]): Promise<void> {
  await ensureStore()
  await fs.writeFile(STORE_FILE, JSON.stringify(rows, null, 2), 'utf8')
}

export function makeBusinessId(businessType: string, location: string): string {
  const slug = businessType.toLowerCase().trim().replace(/\s+/g, '-')
  const loc = location.trim().replace(/\s+/g, '-')
  return `${slug}-${loc}`
}

export async function listCorrections(businessId: string): Promise<CorrectionRow[]> {
  const all = await readAll()
  return all
    .filter((r) => r.businessId === businessId)
    .sort((a, b) => a.weekDate.localeCompare(b.weekDate))
}

export async function recentRatios(businessId: string, n = 3): Promise<number[]> {
  const rows = await listCorrections(businessId)
  return rows.slice(-n).map((r) => r.correctionRatio)
}

export async function upsertCorrection(row: CorrectionRow): Promise<void> {
  const all = await readAll()
  // Replace any existing row for the same (businessId, weekDate); else append.
  const filtered = all.filter(
    (r) => !(r.businessId === row.businessId && r.weekDate === row.weekDate),
  )
  filtered.push(row)
  await writeAll(filtered)
}

export async function clearBusiness(businessId: string): Promise<void> {
  const all = await readAll()
  await writeAll(all.filter((r) => r.businessId !== businessId))
}
