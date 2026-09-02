import { useMemo, useState } from 'react'
import type { ParameterKey } from '../types'

type ParameterKind = 'resistance' | 'capacitance' | 'conductance'

const UNITS: Record<ParameterKind, { label: string; factor: number }[]> = {
  resistance: [
    { label: 'Ω', factor: 1 },
    { label: 'kΩ', factor: 1e3 },
    { label: 'MΩ', factor: 1e6 },
  ],
  capacitance: [
    { label: 'pF', factor: 1e-12 },
    { label: 'nF', factor: 1e-9 },
    { label: 'µF', factor: 1e-6 },
    { label: 'mF', factor: 1e-3 },
  ],
  conductance: [
    { label: 'µS', factor: 1e-6 },
    { label: 'mS', factor: 1e-3 },
  ],
}

function bestUnit(value: number, kind: ParameterKind): number {
  const units = UNITS[kind]
  let best = units[0].factor
  for (const unit of units) {
    if (value / unit.factor >= 1) best = unit.factor
  }
  return best
}

interface ParameterControlProps {
  parameter: ParameterKey
  label: string
  value: number
  kind: ParameterKind
  min: number
  max: number
  onChange: (value: number) => void
  onActive: (parameter: ParameterKey | null) => void
}

export function ParameterControl({
  parameter,
  label,
  value,
  kind,
  min,
  max,
  onChange,
  onActive,
}: ParameterControlProps) {
  const units = UNITS[kind]
  const initialUnit = useMemo(() => bestUnit(value, kind), [kind])
  const [unitFactor, setUnitFactor] = useState(initialUnit)
  const displayValue = Number((value / unitFactor).toPrecision(7))
  const unit = units.find((candidate) => candidate.factor === unitFactor) ?? units[0]

  const commit = (nextValue: number) => {
    if (!Number.isFinite(nextValue)) return
    onChange(Math.min(max, Math.max(min, nextValue)))
  }

  return (
    <div
      className="parameter-control"
      onPointerEnter={() => onActive(parameter)}
      onPointerLeave={() => onActive(null)}
      onFocus={() => onActive(parameter)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onActive(null)
      }}
    >
      <div className="parameter-heading">
        <label htmlFor={`param-${parameter}`}>{label}</label>
        <div className="parameter-value">
          <input
            id={`param-${parameter}`}
            type="number"
            min={min / unitFactor}
            max={max / unitFactor}
            step="any"
            value={displayValue}
            aria-label={`${label}数值`}
            onChange={(event) => commit(Number(event.target.value) * unitFactor)}
          />
          <select
            value={unitFactor}
            aria-label={`${label}单位`}
            onChange={(event) => setUnitFactor(Number(event.target.value))}
          >
            {units.map((candidate) => (
              <option key={candidate.factor} value={candidate.factor}>{candidate.label}</option>
            ))}
          </select>
        </div>
      </div>
      <input
        className="parameter-slider"
        type="range"
        min={Math.log10(min)}
        max={Math.log10(max)}
        step="0.002"
        value={Math.log10(value)}
        aria-label={`${label}对数滑杆`}
        onChange={(event) => commit(10 ** Number(event.target.value))}
      />
    </div>
  )
}
