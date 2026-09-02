import type { BaselineSnapshot, OtaParams, PlantModel, Topology } from './types'

export const TYPE_II_PRESET: OtaParams = {
  R1: 40e3,
  R2: 1.685e3,
  R3: 50,
  R4: 25e3,
  C1: 25.95e-9,
  C2: 9.2e-9,
  C3: 3.96e-9,
  gm: 100e-6,
}

export const TYPE_III_PRESET: OtaParams = {
  R1: 38e3,
  R2: 123.9e3,
  R3: 50,
  R4: 10e3,
  C1: 14.7e-9,
  C2: 9.2e-9,
  C3: 113.5e-12,
  gm: 100e-6,
}

export const DEMO_PLANT: PlantModel = {
  gainDb: 20,
  factors: [
    {
      id: 'demo-lc-pole',
      kind: 'pole',
      shape: 'second-order',
      frequencyHz: 1e3,
      q: 0.707,
    },
    {
      id: 'demo-esr-zero',
      kind: 'zero',
      shape: 'real',
      frequencyHz: 20e3,
      q: 0.707,
    },
  ],
}

export const PRESETS: Record<Topology, OtaParams> = {
  'type2-ota': TYPE_II_PRESET,
  'type3-ota': TYPE_III_PRESET,
}

export const cloneParams = (params: OtaParams): OtaParams => ({ ...params })

export const clonePlant = (plant: PlantModel): PlantModel => ({
  gainDb: plant.gainDb,
  factors: plant.factors.map((factor) => ({ ...factor })),
})

export const makeDefaultBaselines = (): Record<Topology, BaselineSnapshot> => ({
  'type2-ota': { params: cloneParams(TYPE_II_PRESET), plant: clonePlant(DEMO_PLANT) },
  'type3-ota': { params: cloneParams(TYPE_III_PRESET), plant: clonePlant(DEMO_PLANT) },
})
