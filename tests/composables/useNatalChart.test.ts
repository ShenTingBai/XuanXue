// tests/composables/useNatalChart.test.ts
import { describe, it, expect } from 'vitest'
import { calculateNatalChart, computeAspects, computeHouses, type PlanetPosition } from '../../composables/useNatalChart'

describe('calculateNatalChart', () => {
  it('returns null when birthYear is null', () => {
    const result = calculateNatalChart(null, 6, 15, 12, 30)
    expect(result).toBeNull()
  })

  it('returns null when birthMonth is null', () => {
    const result = calculateNatalChart(1990, null, 15, 12, 30)
    expect(result).toBeNull()
  })

  it('returns null when birthDay is null', () => {
    const result = calculateNatalChart(1990, 6, null, 12, 30)
    expect(result).toBeNull()
  })

  it('returns null for year < 1900', () => {
    const result = calculateNatalChart(1500, 6, 15, 12, 30)
    expect(result).toBeNull()
  })

  it('returns valid data for complete birth info', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    expect(result!.planets).toHaveLength(7)
    expect(result!.hasHouses).toBe(true)
    expect(result!.ascSignIndex).not.toBeNull()
    expect(result!.ascLongitude).not.toBeNull()
  })

  it('returns hasHouses=false when birthHour is null', () => {
    const result = calculateNatalChart(1990, 6, 15, null, null)
    expect(result).not.toBeNull()
    expect(result!.planets).toHaveLength(7)
    expect(result!.hasHouses).toBe(false)
  })

  it('each planet has all required fields', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    for (const p of result!.planets) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.glyph).toBeTruthy()
      expect(typeof p.longitude).toBe('number')
      expect(p.longitude).toBeGreaterThanOrEqual(0)
      expect(p.longitude).toBeLessThan(360)
      expect(p.signIndex).toBeGreaterThanOrEqual(0)
      expect(p.signIndex).toBeLessThan(12)
      expect(p.signName).toBeTruthy()
      expect(p.signSymbol).toBeTruthy()
      expect(typeof p.retrograde).toBe('boolean')
      expect(typeof p.boundaryWarning).toBe('boolean')
      if (result!.hasHouses) {
        expect(p.houseIndex).not.toBeNull()
        expect(p.houseIndex!).toBeGreaterThanOrEqual(1)
        expect(p.houseIndex!).toBeLessThanOrEqual(12)
      } else {
        expect(p.houseIndex).toBeNull()
      }
    }
  })

  it('sun and moon are always present', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    const ids = result!.planets.map(p => p.id)
    expect(ids).toContain('sun')
    expect(ids).toContain('moon')
  })

  it('all seven classical planets are present', () => {
    const result = calculateNatalChart(1990, 6, 15, 12, 30)
    expect(result).not.toBeNull()
    const ids = result!.planets.map(p => p.id).sort()
    expect(ids).toEqual(['jupiter', 'mars', 'mercury', 'moon', 'saturn', 'sun', 'venus'])
  })

  it('is deterministic — same inputs produce same outputs', () => {
    const a = calculateNatalChart(1990, 3, 21, 8, 0)
    const b = calculateNatalChart(1990, 3, 21, 8, 0)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    for (let i = 0; i < 7; i++) {
      expect(a!.planets[i].longitude).toBe(b!.planets[i].longitude)
      expect(a!.planets[i].signIndex).toBe(b!.planets[i].signIndex)
    }
  })

  it('birthHour=0 is treated as valid hour (子时)', () => {
    const result = calculateNatalChart(1990, 6, 15, 0, 30)
    expect(result).not.toBeNull()
    expect(result!.hasHouses).toBe(true)
  })
})

describe('computeAspects', () => {
  function makePlanet(id: string, lon: number): PlanetPosition {
    return {
      id: id as PlanetPosition['id'],
      name: id,
      glyph: '',
      longitude: lon,
      signIndex: Math.floor(lon / 30),
      signName: '',
      signSymbol: '',
      houseIndex: null,
      retrograde: false,
      boundaryWarning: false,
    }
  }

  it('detects conjunction (0° within 8° orb)', () => {
    const planets = [makePlanet('sun', 100), makePlanet('moon', 103)]
    const aspects = computeAspects(planets)
    expect(aspects.length).toBeGreaterThanOrEqual(1)
    const conj = aspects.find(a => a.type === 'conjunction')
    expect(conj).toBeDefined()
    expect(conj!.orb).toBeCloseTo(3, 0)
  })

  it('detects trine (120° within 6° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 118)]
    const aspects = computeAspects(planets)
    const trine = aspects.find(a => a.type === 'trine')
    expect(trine).toBeDefined()
  })

  it('detects opposition (180° within 8° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 178)]
    const aspects = computeAspects(planets)
    const opp = aspects.find(a => a.type === 'opposition')
    expect(opp).toBeDefined()
  })

  it('detects square (90° within 6° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 93)]
    const aspects = computeAspects(planets)
    const sq = aspects.find(a => a.type === 'square')
    expect(sq).toBeDefined()
  })

  it('detects sextile (60° within 6° orb)', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 57)]
    const aspects = computeAspects(planets)
    const sextile = aspects.find(a => a.type === 'sextile')
    expect(sextile).toBeDefined()
  })

  it('excludes aspects exceeding orb', () => {
    const planets = [makePlanet('sun', 0), makePlanet('moon', 100)]
    const aspects = computeAspects(planets)
    expect(aspects).toHaveLength(0)
  })

  it('returns empty for single planet', () => {
    const planets = [makePlanet('sun', 100)]
    const aspects = computeAspects(planets)
    expect(aspects).toHaveLength(0)
  })

  it('aspect angle is always 0-180', () => {
    const planets = [makePlanet('sun', 350), makePlanet('moon', 10)]
    const aspects = computeAspects(planets)
    if (aspects.length > 0) {
      expect(aspects[0].angle).toBeGreaterThanOrEqual(0)
      expect(aspects[0].angle).toBeLessThanOrEqual(180)
    }
  })
})

describe('computeHouses', () => {
  it('returns null when ascSignIndex is null', () => {
    expect(computeHouses(null)).toBeNull()
  })

  it('house 1 = ascendant sign', () => {
    const houses = computeHouses(3)
    expect(houses).not.toBeNull()
    expect(houses![0]).toBe(3)
  })

  it('returns 12 houses cycling through signs', () => {
    const houses = computeHouses(0)
    expect(houses).not.toBeNull()
    expect(houses).toHaveLength(12)
    expect(houses).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('wraps around at Pisces (index 11)', () => {
    const houses = computeHouses(10)
    expect(houses).not.toBeNull()
    expect(houses![0]).toBe(10)
    expect(houses![1]).toBe(11)
    expect(houses![2]).toBe(0)
  })
})
