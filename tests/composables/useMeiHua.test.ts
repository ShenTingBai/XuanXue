import { describe, it, expect } from 'vitest'
import {
  calculateMeiHua,
  calculateMeiHuaFromDate,
  type MeiHuaInput,
} from '../../composables/useMeiHua'
import { TRIGRAMS, HEXAGRAMS, SHENG_KE_INTERPRETATIONS } from '../../constants/meihua'

describe('calculateMeiHua', () => {
  it('returns valid result for basic input 3:5:1', () => {
    const input: MeiHuaInput = { upperNumber: 3, lowerNumber: 5, movingNumber: 1, method: 'manual' }
    const result = calculateMeiHua(input)

    expect(result.benGua.upperTrigram).toBe(3)
    expect(result.benGua.lowerTrigram).toBe(5)
    expect(result.benGua.hexagramName).toBe('火风鼎')
    expect(result.bianGua.movingLine).toBe(1)
    expect(result.tiYong.tiGua).toBe(3)
    expect(result.tiYong.yongGua).toBe(5)
    expect(result.benGua.hexagramKey).toBe('3:5')
    expect(result.benGua.upperName).toBe('离')
    expect(result.benGua.lowerName).toBe('巽')
    expect(result.benGua.judgment).toBeTruthy()
    expect(result.benGua.interpretation).toBeTruthy()
    expect(result.bianGua.lineStatement).toBeTruthy()
    expect(result.huGua.hexagramName).toBeTruthy()
    expect(result.input.method).toBe('manual')
  })

  it('handles 1:1:3', () => {
    const result = calculateMeiHua({ upperNumber: 1, lowerNumber: 1, movingNumber: 3, method: 'manual' })
    expect(result.benGua.hexagramName).toBe('乾为天')
    expect(result.bianGua.movingLine).toBe(3)
    expect(result.tiYong.relation).toBe('比和')
  })

  it('handles 8:8:4', () => {
    const result = calculateMeiHua({ upperNumber: 8, lowerNumber: 8, movingNumber: 4, method: 'manual' })
    expect(result.benGua.hexagramName).toBe('坤为地')
    expect(result.bianGua.movingLine).toBe(4)
    expect(result.tiYong.tiGua).toBe(8)
    expect(result.tiYong.yongGua).toBe(8)
    expect(result.tiYong.relation).toBe('比和')
  })

  it('produces hu gua', () => {
    const result = calculateMeiHua({ upperNumber: 3, lowerNumber: 5, movingNumber: 1, method: 'manual' })
    expect(result.huGua.hexagramName).toBeTruthy()
    expect(result.huGua.upperTrigram).toBeGreaterThanOrEqual(1)
    expect(result.huGua.upperTrigram).toBeLessThanOrEqual(8)
  })

  it('body-use relation correct for known pairs', () => {
    const r1 = calculateMeiHua({ upperNumber: 1, lowerNumber: 2, movingNumber: 1, method: 'manual' })
    expect(r1.tiYong.relation).toBe('比和')

    const r2 = calculateMeiHua({ upperNumber: 3, lowerNumber: 6, movingNumber: 1, method: 'manual' })
    expect(r2.tiYong.relation).toBe('用克体')

    const r3 = calculateMeiHua({ upperNumber: 6, lowerNumber: 3, movingNumber: 1, method: 'manual' })
    expect(r3.tiYong.relation).toBe('体克用')
  })

  it('handles large numbers via modulo', () => {
    const result = calculateMeiHua({ upperNumber: 1000, lowerNumber: 2000, movingNumber: 1000, method: 'manual' })
    expect(result.benGua.upperTrigram).toBe(8)
    expect(result.benGua.lowerTrigram).toBe(8)
    expect(result.bianGua.movingLine).toBe(4)
  })

  it('handles negative numbers', () => {
    const result = calculateMeiHua({ upperNumber: -3, lowerNumber: -5, movingNumber: -1, method: 'manual' })
    expect(result.benGua.upperTrigram).toBe(3)
    expect(result.benGua.lowerTrigram).toBe(5)
  })

  it('all 64 hexagrams reachable', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const r = calculateMeiHua({ upperNumber: u, lowerNumber: l, movingNumber: 1, method: 'manual' })
        expect(r.benGua.hexagramName).toBeTruthy()
        expect(r.benGua.judgment).toBeTruthy()
        expect(r.benGua.interpretation).toBeTruthy()
      }
    }
  })

  it('line statements exist for all combos', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        for (let m = 1; m <= 6; m++) {
          const r = calculateMeiHua({ upperNumber: u, lowerNumber: l, movingNumber: m, method: 'manual' })
          expect(r.bianGua.lineStatement).toBeTruthy()
        }
      }
    }
  })

  it('random method valid', () => {
    for (let i = 0; i < 10; i++) {
      const r = calculateMeiHua({ upperNumber: Math.floor(Math.random()*999)+1, lowerNumber: Math.floor(Math.random()*999)+1, movingNumber: Math.floor(Math.random()*999)+1, method: 'random' })
      expect(r.benGua.hexagramName).toBeTruthy()
      expect(r.tiYong.relation).toBeTruthy()
    }
  })
})

describe('calculateMeiHuaFromDate', () => {
  it('consistent for same input', () => {
    const r1 = calculateMeiHuaFromDate(2024, 6, 15, 4)
    const r2 = calculateMeiHuaFromDate(2024, 6, 15, 4)
    expect(r1.benGua.hexagramKey).toBe(r2.benGua.hexagramKey)
  })

  it('correct numbers', () => {
    const r = calculateMeiHuaFromDate(2024, 6, 15, 6)
    expect(r.benGua.upperTrigram).toBe(5)
    expect(r.benGua.lowerTrigram).toBe(3)
    expect(r.bianGua.movingLine).toBe(5)
  })

  it('handles default hour', () => {
    const r = calculateMeiHuaFromDate(2024, 1, 1)
    expect(r.benGua.hexagramName).toBeTruthy()
    expect(r.input.method).toBe('time')
  })
})

describe('TRIGRAMS', () => {
  it('all 8 trigrams populated', () => {
    expect(Object.keys(TRIGRAMS)).toHaveLength(8)
    for (let i = 1; i <= 8; i++) {
      expect(TRIGRAMS[i].name).toBeTruthy()
      expect(TRIGRAMS[i].symbol).toBeTruthy()
    }
  })
})

describe('HEXAGRAMS', () => {
  it('all 64 hexagrams complete', () => {
    let count = 0
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const h = HEXAGRAMS[u + ':' + l]
        expect(h).toBeDefined()
        expect(h.name).toBeTruthy()
        expect(h.judgment).toBeTruthy()
        expect(h.interpretation).toBeTruthy()
        count++
      }
    }
    expect(count).toBe(64)
  })
})

describe('SHENG_KE_INTERPRETATIONS', () => {
  it('has 25 entries', () => {
    expect(Object.keys(SHENG_KE_INTERPRETATIONS)).toHaveLength(25)
  })

  it('same wuxing gives bi he', () => {
    expect(SHENG_KE_INTERPRETATIONS['木:木'].result).toBe('比和')
    expect(SHENG_KE_INTERPRETATIONS['火:火'].result).toBe('比和')
  })

  it('each entry has result and description', () => {
    for (const entry of Object.values(SHENG_KE_INTERPRETATIONS)) {
      expect(entry.result).toBeTruthy()
      expect(entry.description).toBeTruthy()
    }
  })
})
