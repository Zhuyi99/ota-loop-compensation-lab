import type { ParameterKey, Topology } from '../types'

interface CircuitDiagramProps {
  topology: Topology
  active: ParameterKey | null
}

const componentClass = (key: ParameterKey, active: ParameterKey | null) =>
  `circuit-component${key === active ? ' active' : ''}`

function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g className="circuit-wire">
      <line x1={x} y1={y} x2={x} y2={y + 7} />
      <line x1={x - 9} y1={y + 7} x2={x + 9} y2={y + 7} />
      <line x1={x - 6} y1={y + 11} x2={x + 6} y2={y + 11} />
      <line x1={x - 3} y1={y + 15} x2={x + 3} y2={y + 15} />
    </g>
  )
}

function Resistor({ x, y1, y2, label, active }: { x: number; y1: number; y2: number; label: ParameterKey; active: ParameterKey | null }) {
  const span = y2 - y1
  const start = y1 + span * 0.18
  const end = y2 - span * 0.18
  const points = [
    `${x},${y1}`, `${x},${start}`,
    `${x - 6},${start + 5}`, `${x + 6},${start + 11}`,
    `${x - 6},${start + 17}`, `${x + 6},${start + 23}`,
    `${x},${end}`, `${x},${y2}`,
  ].join(' ')
  return (
    <g className={componentClass(label, active)}>
      <polyline points={points} />
      <text x={x + 12} y={(y1 + y2) / 2 + 4}>{label}</text>
    </g>
  )
}

function Capacitor({ x, y, label, active }: { x: number; y: number; label: ParameterKey; active: ParameterKey | null }) {
  return (
    <g className={componentClass(label, active)}>
      <line x1={x} y1={y - 22} x2={x} y2={y - 5} />
      <line x1={x - 9} y1={y - 5} x2={x + 9} y2={y - 5} />
      <line x1={x - 9} y1={y + 5} x2={x + 9} y2={y + 5} />
      <line x1={x} y1={y + 5} x2={x} y2={y + 22} />
      <text x={x + 13} y={y + 4}>{label}</text>
    </g>
  )
}

export function CircuitDiagram({ topology, active }: CircuitDiagramProps) {
  return (
    <div className="circuit-wrap">
      <svg className="circuit" viewBox="0 0 390 245" role="img" aria-label={`${topology === 'type2-ota' ? 'Type II' : 'Type III'} OTA 补偿电路示意图`}>
        <text className="node-label" x="338" y="17">Vₒ</text>
        <text className="node-label" x="22" y="112">Vₑ</text>
        <g className="circuit-wire">
          <line x1="345" y1="22" x2="345" y2="35" />
          <line x1="345" y1="105" x2="250" y2="105" />
          <line x1="345" y1="105" x2="345" y2="125" />
          <line x1="345" y1="195" x2="345" y2="210" />
          <circle cx="345" cy="105" r="3" />
          <line x1="238" y1="105" x2="250" y2="105" />
          <line x1="35" y1="105" x2="165" y2="105" />
        </g>
        <Resistor x={345} y1={35} y2={105} label="R1" active={active} />
        <Resistor x={345} y1={125} y2={195} label="R4" active={active} />
        <Ground x={345} y={210} />

        {topology === 'type3-ota' && (
          <g>
            <g className="circuit-wire">
              <line x1="345" y1="22" x2="287" y2="22" />
              <line x1="287" y1="22" x2="287" y2="32" />
              <line x1="287" y1="112" x2="287" y2="120" />
              <line x1="287" y1="120" x2="345" y2="120" />
            </g>
            <Resistor x={287} y1={32} y2={78} label="R3" active={active} />
            <Capacitor x={287} y={92} label="C2" active={active} />
          </g>
        )}

        <g className={componentClass('gm', active)}>
          <polygon points="165,66 165,144 238,105" />
          <circle cx="197" cy="105" r="10" />
          <path d="M189 105 C192 97, 199 97, 203 105 C199 113, 192 113, 189 105" />
          <text x="184" y="57">gₘ</text>
          <text x="169" y="92">−</text>
          <text x="169" y="130">+</text>
        </g>
        <g className="circuit-wire">
          <line x1="165" y1="125" x2="148" y2="125" />
          <line x1="148" y1="125" x2="148" y2="170" />
        </g>
        <text className="node-label" x="156" y="176">Vref</text>
        <Ground x={148} y={170} />

        <g className="circuit-wire">
          <line x1="62" y1="105" x2="62" y2="135" />
          <line x1="118" y1="105" x2="118" y2="126" />
        </g>
        <Capacitor x={62} y={152} label="C3" active={active} />
        <Capacitor x={118} y={143} label="C1" active={active} />
        <Resistor x={118} y1={165} y2={211} label="R2" active={active} />
        <g className="circuit-wire">
          <line x1="62" y1="174" x2="62" y2="211" />
        </g>
        <Ground x={62} y={211} />
        <Ground x={118} y={211} />
      </svg>
      <div className="circuit-caption">
        <span>{topology === 'type2-ota' ? 'Type II OTA' : 'Type III OTA'}</span>
        <small>基于 SLVA662 图 {topology === 'type2-ota' ? '5' : '9'} 的功能化重绘</small>
      </div>
    </div>
  )
}
