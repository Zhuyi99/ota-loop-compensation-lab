import type {
  BodeResult,
  BodeSeries,
  Breakpoint,
  GainCrossover,
  OtaParams,
  PhaseCrossover,
  PlantModel,
  Topology,
} from '../types'
import { add, complex, divide, magnitude, multiply, phaseDeg, scale, type Complex } from './complex'

const TAU = 2 * Math.PI

export function logSpace(startHz: number, endHz: number, count = 800): number[] {
  const safeStart = Math.max(startHz, Number.MIN_VALUE)
  const start = Math.log10(safeStart)
  const end = Math.log10(Math.max(endHz, safeStart * 1.000001))
  return Array.from({ length: count }, (_, index) => 10 ** (start + ((end - start) * index) / (count - 1)))
}

export function compensatorAt(topology: Topology, params: OtaParams, frequencyHz: number): Complex {
  const s = complex(0, TAU * frequencyHz)
  const numeratorBranch = add(complex(1), scale(s, params.R2 * params.C1))
  const denominatorBranch = add(
    scale(s, params.C1 + params.C3),
    scale(multiply(s, s), params.R2 * params.C3 * params.C1),
  )
  const compensationBranch = divide(numeratorBranch, denominatorBranch)

  if (topology === 'type2-ota') {
    return scale(compensationBranch, (params.R4 / (params.R1 + params.R4)) * params.gm)
  }

  const dividerNumerator = add(
    complex(params.R4),
    scale(s, (params.R1 + params.R3) * params.C2 * params.R4),
  )
  const dividerDenominator = add(
    complex(params.R1 + params.R4),
    scale(
      s,
      (params.R4 * params.R1 + params.R3 * params.R1 + params.R3 * params.R4) * params.C2,
    ),
  )
  return scale(multiply(divide(dividerNumerator, dividerDenominator), compensationBranch), params.gm)
}

export function plantAt(plant: PlantModel, frequencyHz: number): Complex {
  const omega = TAU * frequencyHz
  let response = complex(10 ** (plant.gainDb / 20))

  for (const factor of plant.factors) {
    if (!(factor.frequencyHz > 0) || !(factor.q > 0)) continue
    const omega0 = TAU * factor.frequencyHz
    const ratio = omega / omega0
    const term = factor.shape === 'real'
      ? complex(1, ratio)
      : complex(1 - ratio * ratio, ratio / factor.q)
    response = factor.kind === 'zero' ? multiply(response, term) : divide(response, term)
  }

  return response
}

function unwrap(phases: number[]): number[] {
  if (!phases.length) return []
  const result = [phases[0]]
  for (let index = 1; index < phases.length; index += 1) {
    let current = phases[index]
    const previous = result[index - 1]
    while (current - previous > 180) current -= 360
    while (current - previous < -180) current += 360
    result.push(current)
  }
  return result
}

function toSeries(values: Complex[]): BodeSeries {
  const standard = unwrap(values.map(phaseDeg))
  return {
    magnitudeDb: values.map((value) => 20 * Math.log10(Math.max(magnitude(value), 1e-300))),
    phaseStandardDeg: standard,
    phaseDocumentDeg: standard.map((phase) => phase + 180),
  }
}

export function deriveBreakpoints(topology: Topology, params: OtaParams): Breakpoint[] {
  const result: Breakpoint[] = [
    {
      id: 'z-r2-c1',
      kind: 'zero',
      label: '补偿支路零点',
      frequencyHz: 1 / (TAU * params.R2 * params.C1),
      source: 'R2 · C1',
    },
    {
      id: 'p-r2-c1-c3',
      kind: 'pole',
      label: '补偿支路高频极点',
      frequencyHz: (params.C1 + params.C3) / (TAU * params.R2 * params.C1 * params.C3),
      source: 'R2 · C1 · C3',
    },
  ]

  if (topology === 'type3-ota') {
    result.push(
      {
        id: 'z-divider',
        kind: 'zero',
        label: '前馈支路零点',
        frequencyHz: 1 / (TAU * (params.R1 + params.R3) * params.C2),
        source: '(R1 + R3) · C2',
      },
      {
        id: 'p-divider',
        kind: 'pole',
        label: '分压网络极点',
        frequencyHz: 1 / (TAU * ((params.R4 * params.R1) / (params.R4 + params.R1) + params.R3) * params.C2),
        source: '(R1 ∥ R4 + R3) · C2',
      },
    )
  }

  return result.sort((a, b) => a.frequencyHz - b.frequencyHz)
}

function interpolateOnLogX(x1: number, x2: number, y1: number, y2: number, target: number): number {
  if (y1 === y2) return Math.sqrt(x1 * x2)
  const ratio = (target - y1) / (y2 - y1)
  return 10 ** (Math.log10(x1) + ratio * (Math.log10(x2) - Math.log10(x1)))
}

function interpolateYOnLogX(x1: number, x2: number, y1: number, y2: number, x: number): number {
  const span = Math.log10(x2) - Math.log10(x1)
  const ratio = span === 0 ? 0 : (Math.log10(x) - Math.log10(x1)) / span
  return y1 + ratio * (y2 - y1)
}

export function findGainCrossovers(
  frequenciesHz: number[],
  magnitudeDb: number[],
  phaseDegValues: number[],
): GainCrossover[] {
  const crossings: GainCrossover[] = []
  for (let index = 0; index < magnitudeDb.length - 1; index += 1) {
    const left = magnitudeDb[index]
    const right = magnitudeDb[index + 1]
    if (!Number.isFinite(left) || !Number.isFinite(right)) continue
    if ((left > 0 && right > 0) || (left < 0 && right < 0) || left === right) continue
    const frequencyHz = interpolateOnLogX(frequenciesHz[index], frequenciesHz[index + 1], left, right, 0)
    const phase = interpolateYOnLogX(
      frequenciesHz[index],
      frequenciesHz[index + 1],
      phaseDegValues[index],
      phaseDegValues[index + 1],
      frequencyHz,
    )
    crossings.push({
      frequencyHz,
      phaseDeg: phase,
      phaseMarginDeg: 180 + phase,
      direction: right < left ? 'down' : 'up',
    })
  }
  return crossings
}

export function findPhaseCrossovers(
  frequenciesHz: number[],
  magnitudeDb: number[],
  phaseDegValues: number[],
): PhaseCrossover[] {
  const crossings: PhaseCrossover[] = []
  for (let index = 0; index < phaseDegValues.length - 1; index += 1) {
    const left = phaseDegValues[index]
    const right = phaseDegValues[index + 1]
    if ((left > -180 && right > -180) || (left < -180 && right < -180) || left === right) continue
    const frequencyHz = interpolateOnLogX(frequenciesHz[index], frequenciesHz[index + 1], left, right, -180)
    const gain = interpolateYOnLogX(
      frequenciesHz[index],
      frequenciesHz[index + 1],
      magnitudeDb[index],
      magnitudeDb[index + 1],
      frequencyHz,
    )
    crossings.push({ frequencyHz, magnitudeDb: gain, gainMarginDb: -gain })
  }
  return crossings
}

export function calculateBode(
  topology: Topology,
  params: OtaParams,
  plant: PlantModel,
  startHz = 10,
  endHz = 1e6,
  count = 800,
): BodeResult {
  const frequenciesHz = logSpace(startHz, endHz, count)
  const compensatorValues = frequenciesHz.map((frequency) => compensatorAt(topology, params, frequency))
  const plantValues = frequenciesHz.map((frequency) => plantAt(plant, frequency))
  const loopValues = compensatorValues.map((value, index) => multiply(value, plantValues[index]))
  const compensator = toSeries(compensatorValues)
  const plantSeries = toSeries(plantValues)
  const loop = toSeries(loopValues)
  const gainCrossovers = findGainCrossovers(frequenciesHz, loop.magnitudeDb, loop.phaseStandardDeg)
  const phaseCrossovers = findPhaseCrossovers(frequenciesHz, loop.magnitudeDb, loop.phaseStandardDeg)
  const primaryCrossover = gainCrossovers.find((crossing) => crossing.direction === 'down') ?? gainCrossovers[0] ?? null

  return {
    frequenciesHz,
    compensator,
    plant: plantSeries,
    loop,
    breakpoints: deriveBreakpoints(topology, params),
    gainCrossovers,
    phaseCrossovers,
    primaryCrossover,
    primaryGainMarginDb: phaseCrossovers[0]?.gainMarginDb ?? null,
  }
}

export function sampleSeriesAt(
  frequenciesHz: number[],
  values: number[],
  frequencyHz: number,
): number {
  if (frequencyHz <= frequenciesHz[0]) return values[0]
  if (frequencyHz >= frequenciesHz[frequenciesHz.length - 1]) return values[values.length - 1]
  let low = 0
  let high = frequenciesHz.length - 1
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2)
    if (frequenciesHz[middle] <= frequencyHz) low = middle
    else high = middle
  }
  return interpolateYOnLogX(
    frequenciesHz[low], frequenciesHz[high], values[low], values[high], frequencyHz,
  )
}
