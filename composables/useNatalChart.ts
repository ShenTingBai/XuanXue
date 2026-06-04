// composables/useNatalChart.ts
import { GeoVector, Ecliptic, Body } from 'astronomy-engine'
import { ZODIACS, getRisingSign } from '~/composables/useConstellation'
import { PLANET_ORDER, PLANET_META } from '~/constants/planet-data'
import type { PlanetMeta } from '~/constants/planet-data'
import { ASPECT_TYPES } from '~/constants/planet-data'

// ── Types ───────────────────────────────────────────────────────

export interface PlanetPosition {
  id: 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  name: string
  glyph: string
  longitude: number
  signIndex: number
  signName: string
  signSymbol: string
  houseIndex: number | null
  retrograde: boolean
  boundaryWarning: boolean
}

export interface AspectLine {
  p1: string
  p2: string
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  angle: number
  orb: number
}

export interface NatalChartData {
  planets: PlanetPosition[]
  aspects: AspectLine[]
  ascSignIndex: number | null
  ascLongitude: number | null
  mcLongitude: number | null
  hasHouses: boolean
}

// ── Body Mapping ────────────────────────────────────────────────

const BODY_MAP: Array<{ id: string; body: Body; meta: PlanetMeta }> = [
  { id: 'sun',     body: Body.Sun,     meta: PLANET_META.sun },
  { id: 'moon',    body: Body.Moon,    meta: PLANET_META.moon },
  { id: 'mercury', body: Body.Mercury, meta: PLANET_META.mercury },
  { id: 'venus',   body: Body.Venus,   meta: PLANET_META.venus },
  { id: 'mars',    body: Body.Mars,    meta: PLANET_META.mars },
  { id: 'jupiter', body: Body.Jupiter, meta: PLANET_META.jupiter },
  { id: 'saturn',  body: Body.Saturn,  meta: PLANET_META.saturn },
]

// ── Math Helpers ────────────────────────────────────────────────

/** Angular distance between two ecliptic longitudes, normalized to 0-180 degrees */
function angularDistance(a: number, b: number): number {
  let d = Math.abs(a - b) % 360
  if (d > 180) d = 360 - d
  return d
}

/** Get zodiac sign index (0=Aries..11=Pisces) from ecliptic longitude */
function getSignIndex(lon: number): number {
  return Math.floor(((lon % 360) + 360) % 360 / 30)
}

/** Check if longitude is within +/-2 degrees of a sign boundary */
function isNearBoundary(lon: number): boolean {
  const rem = ((lon % 360) + 360) % 360
  const posInSign = rem % 30
  return posInSign < 2 || posInSign > 28
}

// ── Retrograde Detection ────────────────────────────────────────

function isRetrograde(body: Body, birthDate: Date): boolean {
  try {
    const today = Ecliptic(GeoVector(body, birthDate, true)).elon
    const nextDay = new Date(birthDate.getTime() + 86400000)
    const tomorrow = Ecliptic(GeoVector(body, nextDay, true)).elon
    return tomorrow < today
  } catch {
    return false
  }
}

// ── Planet Position Computation ─────────────────────────────────

function computePlanetPositions(birthDate: Date): PlanetPosition[] {
  return BODY_MAP.map(({ id, body, meta }) => {
    let longitude: number
    try {
      const geo = GeoVector(body, birthDate, true)
      const ecl = Ecliptic(geo)
      longitude = ((ecl.elon % 360) + 360) % 360
    } catch {
      longitude = 0
    }

    const signIndex = getSignIndex(longitude)
    const sign = ZODIACS[signIndex]
    const retrograde = isRetrograde(body, birthDate)

    return {
      id: id as PlanetPosition['id'],
      name: meta.name,
      glyph: meta.glyph,
      longitude,
      signIndex,
      signName: sign.name,
      signSymbol: sign.symbol,
      houseIndex: null,
      retrograde,
      boundaryWarning: isNearBoundary(longitude),
    }
  })
}

// ── Aspect Computation ──────────────────────────────────────────

export function computeAspects(planets: PlanetPosition[]): AspectLine[] {
  const aspects: AspectLine[] = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const angle = angularDistance(planets[i].longitude, planets[j].longitude)

      for (const aspectType of ASPECT_TYPES) {
        const diff = Math.abs(angle - aspectType.angle)
        const tightOrb = aspectType.orb / 2
        if (diff <= tightOrb) {
          aspects.push({
            p1: planets[i].id,
            p2: planets[j].id,
            type: aspectType.type as AspectLine['type'],
            angle: Math.round(angle * 10) / 10,
            orb: Math.round(diff * 10) / 10,
          })
          break
        }
      }
    }
  }

  return aspects
}

// ── Whole Sign House Computation ────────────────────────────────

export function computeHouses(ascSignIndex: number | null): number[] | null {
  if (ascSignIndex === null) return null
  const houses: number[] = []
  for (let i = 0; i < 12; i++) {
    houses.push((ascSignIndex + i) % 12)
  }
  return houses
}

function assignHouses(planets: PlanetPosition[], ascSignIndex: number): void {
  for (const p of planets) {
    p.houseIndex = ((p.signIndex - ascSignIndex + 12) % 12) + 1
  }
}

// ── Main Function ───────────────────────────────────────────────

export function calculateNatalChart(
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
  birthHour: number | null | undefined,
  birthMinute: number | null | undefined,
): NatalChartData | null {
  if (birthYear === null || birthYear === undefined || birthYear < 1900 || birthYear > 2100) return null
  if (birthMonth === null || birthMonth === undefined || birthMonth < 1 || birthMonth > 12) return null
  if (birthDay === null || birthDay === undefined || birthDay < 1 || birthDay > 31) return null

  const hasHouses = birthHour !== null && birthHour !== undefined

  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay, 12, 0, 0))

  const planets = computePlanetPositions(birthDate)
  const aspects = computeAspects(planets)

  let ascSignIndex: number | null = null
  let ascLongitude: number | null = null
  let mcLongitude: number | null = null

  if (hasHouses && birthHour !== null && birthHour !== undefined) {
    const rising = getRisingSign(birthYear, birthMonth, birthDay, birthHour, birthMinute ?? null)
    if (rising) {
      const found = ZODIACS.findIndex(z => z.name === rising.name)
      if (found >= 0) {
        ascSignIndex = found
        ascLongitude = found * 30 + 15
        mcLongitude = (ascLongitude + 270) % 360
        assignHouses(planets, ascSignIndex)
      }
    }
  }

  return {
    planets,
    aspects,
    ascSignIndex,
    ascLongitude,
    mcLongitude,
    hasHouses,
  }
}
