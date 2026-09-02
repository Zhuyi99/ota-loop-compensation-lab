import { describe, expect, it } from 'vitest'
import { DEMO_PLANT, TYPE_II_PRESET, TYPE_III_PRESET } from '../presets'
import { calculateBode, compensatorAt, deriveBreakpoints, findGainCrossovers, plantAt } from './bode'
import { magnitude, phaseDeg } from './complex'

describe('OTA compensator transfer functions', () => {
  it('matches the Type II document example', () => {
    const breakpoints = deriveBreakpoints('type2-ota', TYPE_II_PRESET)
    expect(breakpoints.find((point) => point.kind === 'zero')?.frequencyHz).toBeCloseTo(3640, -1)
    expect(breakpoints.find((point) => point.kind === 'pole')?.frequencyHz).toBeCloseTo(27500, -2)

    const response = compensatorAt('type2-ota', TYPE_II_PRESET, 10e3)
    expect(20 * Math.log10(magnitude(response))).toBeCloseTo(-25, 2)
    expect(phaseDeg(response)).toBeCloseTo(-40, 1)
  })

  it('matches the Type III document example using source-based pole labels', () => {
    const points = deriveBreakpoints('type3-ota', TYPE_III_PRESET)
    const values = points.map((point) => point.frequencyHz).sort((a, b) => a - b)
    expect(values[0]).toBeCloseTo(87.7, 0)
    expect(values[1]).toBeCloseTo(454.7, 0)
    expect(values[2]).toBeCloseTo(2170, -1)
    expect(values[3]).toBeCloseTo(11400, -2)

    const response = compensatorAt('type3-ota', TYPE_III_PRESET, 1e3)
    expect(20 * Math.log10(magnitude(response))).toBeCloseTo(15, 1)
  })

  it('keeps magnitude identical between standard and document phase modes', () => {
    const result = calculateBode('type2-ota', TYPE_II_PRESET, DEMO_PLANT)
    expect(result.compensator.phaseDocumentDeg[100] - result.compensator.phaseStandardDeg[100]).toBeCloseTo(180, 8)
    expect(result.compensator.magnitudeDb).toHaveLength(result.compensator.phaseDocumentDeg.length)
  })
})

describe('plant and margin calculations', () => {
  it('evaluates a second-order pole at its natural frequency', () => {
    const response = plantAt({
      gainDb: 0,
      factors: [{ id: 'p', kind: 'pole', shape: 'second-order', frequencyHz: 1000, q: 0.5 }],
    }, 1000)
    expect(20 * Math.log10(magnitude(response))).toBeCloseTo(-6.0206, 3)
    expect(phaseDeg(response)).toBeCloseTo(-90, 6)
  })

  it('finds downward, upward, and absent 0 dB crossings', () => {
    const frequencies = [10, 100, 1000, 10000]
    const phase = [-10, -60, -120, -200]
    const crossings = findGainCrossovers(frequencies, [10, -10, -5, 5], phase)
    expect(crossings).toHaveLength(2)
    expect(crossings[0].direction).toBe('down')
    expect(crossings[1].direction).toBe('up')
    expect(findGainCrossovers(frequencies, [5, 4, 3, 2], phase)).toHaveLength(0)
  })
})
