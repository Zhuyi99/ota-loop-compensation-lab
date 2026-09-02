export type Topology = 'type2-ota' | 'type3-ota'
export type ViewMode = 'compensator' | 'loop'
export type PhaseMode = 'standard' | 'document'
export type ParameterKey = keyof OtaParams

export interface OtaParams {
  R1: number
  R2: number
  R3: number
  R4: number
  C1: number
  C2: number
  C3: number
  gm: number
}

export type PlantFactorKind = 'pole' | 'zero'
export type PlantFactorShape = 'real' | 'second-order'

export interface PlantFactor {
  id: string
  kind: PlantFactorKind
  shape: PlantFactorShape
  frequencyHz: number
  q: number
}

export interface PlantModel {
  gainDb: number
  factors: PlantFactor[]
}

export interface Breakpoint {
  id: string
  kind: 'pole' | 'zero'
  label: string
  frequencyHz: number
  source: string
}

export interface BodeSeries {
  magnitudeDb: number[]
  phaseStandardDeg: number[]
  phaseDocumentDeg: number[]
}

export interface GainCrossover {
  frequencyHz: number
  phaseDeg: number
  phaseMarginDeg: number
  direction: 'down' | 'up'
}

export interface PhaseCrossover {
  frequencyHz: number
  magnitudeDb: number
  gainMarginDb: number
}

export interface BodeResult {
  frequenciesHz: number[]
  compensator: BodeSeries
  plant: BodeSeries
  loop: BodeSeries
  breakpoints: Breakpoint[]
  gainCrossovers: GainCrossover[]
  phaseCrossovers: PhaseCrossover[]
  primaryCrossover: GainCrossover | null
  primaryGainMarginDb: number | null
}

export interface BaselineSnapshot {
  params: OtaParams
  plant: PlantModel
}
