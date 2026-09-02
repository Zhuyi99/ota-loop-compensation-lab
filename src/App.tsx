import { useEffect, useMemo, useState } from 'react'
import { BodeChart } from './components/BodeChart'
import { CircuitDiagram } from './components/CircuitDiagram'
import { ParameterControl } from './components/ParameterControl'
import { PlantEditor } from './components/PlantEditor'
import { Segmented } from './components/Segmented'
import { calculateBode, sampleSeriesAt } from './math/bode'
import {
  cloneParams,
  clonePlant,
  DEMO_PLANT,
  makeDefaultBaselines,
  PRESETS,
  TYPE_II_PRESET,
  TYPE_III_PRESET,
} from './presets'
import type {
  BaselineSnapshot,
  OtaParams,
  ParameterKey,
  PhaseMode,
  PlantModel,
  Topology,
  ViewMode,
} from './types'

const STORAGE_KEY = 'ota-loop-compensation-lab:v1'

interface PersistedState {
  topology: Topology
  viewMode: ViewMode
  phaseMode: PhaseMode
  paramsByTopology: Record<Topology, OtaParams>
  baselines: Record<Topology, BaselineSnapshot>
  plant: PlantModel
  startHz: number
  endHz: number
  cursorHz: number
}

const DEFAULT_STATE: PersistedState = {
  topology: 'type2-ota',
  viewMode: 'compensator',
  phaseMode: 'standard',
  paramsByTopology: {
    'type2-ota': cloneParams(TYPE_II_PRESET),
    'type3-ota': cloneParams(TYPE_III_PRESET),
  },
  baselines: makeDefaultBaselines(),
  plant: clonePlant(DEMO_PLANT),
  startHz: 10,
  endHz: 1e6,
  cursorHz: 10e3,
}

function validParams(value: unknown, fallback: OtaParams): OtaParams {
  if (!value || typeof value !== 'object') return cloneParams(fallback)
  const record = value as Partial<OtaParams>
  const next = cloneParams(fallback)
  for (const key of Object.keys(next) as ParameterKey[]) {
    if (typeof record[key] === 'number' && Number.isFinite(record[key]) && record[key]! > 0) next[key] = record[key]!
  }
  return next
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const stored = JSON.parse(raw) as Partial<PersistedState>
    const topology = stored.topology === 'type3-ota' ? 'type3-ota' : 'type2-ota'
    const paramsByTopology = {
      'type2-ota': validParams(stored.paramsByTopology?.['type2-ota'], TYPE_II_PRESET),
      'type3-ota': validParams(stored.paramsByTopology?.['type3-ota'], TYPE_III_PRESET),
    }
    const defaults = makeDefaultBaselines()
    const baselines = {
      'type2-ota': {
        params: validParams(stored.baselines?.['type2-ota']?.params, defaults['type2-ota'].params),
        plant: stored.baselines?.['type2-ota']?.plant ?? defaults['type2-ota'].plant,
      },
      'type3-ota': {
        params: validParams(stored.baselines?.['type3-ota']?.params, defaults['type3-ota'].params),
        plant: stored.baselines?.['type3-ota']?.plant ?? defaults['type3-ota'].plant,
      },
    }
    return {
      ...DEFAULT_STATE,
      ...stored,
      topology,
      viewMode: stored.viewMode === 'loop' ? 'loop' : 'compensator',
      phaseMode: stored.phaseMode === 'document' ? 'document' : 'standard',
      paramsByTopology,
      baselines,
      plant: stored.plant ?? clonePlant(DEMO_PLANT),
      startHz: typeof stored.startHz === 'number' && stored.startHz > 0 ? stored.startHz : 10,
      endHz: typeof stored.endHz === 'number' && stored.endHz > 0 ? stored.endHz : 1e6,
      cursorHz: typeof stored.cursorHz === 'number' && stored.cursorHz > 0 ? stored.cursorHz : 10e3,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function engineering(value: number, unit = 'Hz', digits = 3): string {
  if (!Number.isFinite(value)) return '—'
  const prefixes = [
    { threshold: 1e9, divisor: 1e9, prefix: 'G' },
    { threshold: 1e6, divisor: 1e6, prefix: 'M' },
    { threshold: 1e3, divisor: 1e3, prefix: 'k' },
    { threshold: 1, divisor: 1, prefix: '' },
    { threshold: 1e-3, divisor: 1e-3, prefix: 'm' },
    { threshold: 1e-6, divisor: 1e-6, prefix: 'µ' },
    { threshold: 1e-9, divisor: 1e-9, prefix: 'n' },
    { threshold: 0, divisor: 1e-12, prefix: 'p' },
  ]
  const choice = prefixes.find((item) => Math.abs(value) >= item.threshold) ?? prefixes.at(-1)!
  return `${Number((value / choice.divisor).toPrecision(digits))} ${choice.prefix}${unit}`
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail?: string; accent?: 'blue' | 'orange' | 'green' }) {
  return (
    <div className={`metric-card${accent ? ` ${accent}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}

export default function App() {
  const [initial] = useState(loadState)
  const [topology, setTopology] = useState(initial.topology)
  const [viewMode, setViewMode] = useState(initial.viewMode)
  const [phaseMode, setPhaseMode] = useState(initial.phaseMode)
  const [paramsByTopology, setParamsByTopology] = useState(initial.paramsByTopology)
  const [baselines, setBaselines] = useState(initial.baselines)
  const [plant, setPlant] = useState(initial.plant)
  const [startHz, setStartHz] = useState(initial.startHz)
  const [endHz, setEndHz] = useState(initial.endHz)
  const [cursorHz, setCursorHz] = useState(initial.cursorHz)
  const [activeParameter, setActiveParameter] = useState<ParameterKey | null>(null)
  const [savedPulse, setSavedPulse] = useState(false)

  const params = paramsByTopology[topology]
  const baseline = baselines[topology]
  const safeStart = Math.max(1e-6, Math.min(startHz, endHz / 1.001))
  const safeEnd = Math.max(endHz, safeStart * 1.001)

  const result = useMemo(
    () => calculateBode(topology, params, plant, safeStart, safeEnd),
    [topology, params, plant, safeStart, safeEnd],
  )
  const baselineResult = useMemo(
    () => calculateBode(topology, baseline.params, baseline.plant, safeStart, safeEnd),
    [topology, baseline, safeStart, safeEnd],
  )

  useEffect(() => {
    const state: PersistedState = {
      topology, viewMode, phaseMode, paramsByTopology, baselines, plant, startHz, endHz, cursorHz,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [topology, viewMode, phaseMode, paramsByTopology, baselines, plant, startHz, endHz, cursorHz])

  const updateParam = (key: ParameterKey, value: number) => {
    setParamsByTopology((current) => ({
      ...current,
      [topology]: { ...current[topology], [key]: value },
    }))
  }

  const switchTopology = (next: Topology) => {
    setTopology(next)
    setCursorHz(next === 'type2-ota' ? 10e3 : 1e3)
  }

  const resetPreset = () => {
    setParamsByTopology((current) => ({ ...current, [topology]: cloneParams(PRESETS[topology]) }))
    setCursorHz(topology === 'type2-ota' ? 10e3 : 1e3)
  }

  const setBaseline = () => {
    setBaselines((current) => ({
      ...current,
      [topology]: { params: cloneParams(params), plant: clonePlant(plant) },
    }))
    setSavedPulse(true)
    window.setTimeout(() => setSavedPulse(false), 1200)
  }

  const displayedSeries = viewMode === 'compensator' ? result.compensator : result.loop
  const displayedPhase = phaseMode === 'standard' ? displayedSeries.phaseStandardDeg : displayedSeries.phaseDocumentDeg
  const clampedCursor = Math.min(safeEnd, Math.max(safeStart, cursorHz))
  const cursorGain = sampleSeriesAt(result.frequenciesHz, displayedSeries.magnitudeDb, clampedCursor)
  const cursorPhase = sampleSeriesAt(result.frequenciesHz, displayedPhase, clampedCursor)
  const invalidPlantFactors = plant.factors.filter((factor) => !(factor.frequencyHz > 0) || (factor.shape === 'second-order' && !(factor.q > 0))).length

  const resistanceProps = { kind: 'resistance' as const, min: 1, max: 10e6 }
  const capacitanceProps = { kind: 'capacitance' as const, min: 1e-12, max: 10e-3 }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="eyebrow"><span className="live-dot" />INTERACTIVE CONTROL LAB</div>
          <h1>OTA 环路补偿实验室</h1>
          <p>拖动元件参数，实时观察零极点、增益、相位与稳定裕量如何变化。</p>
        </div>
        <div className="hero-badge">
          <span>理想小信号模型</span>
          <strong>SLVA662</strong>
        </div>
      </header>

      <section className="mode-bar" aria-label="视图设置">
        <Segmented
          label="补偿拓扑"
          value={topology}
          options={[{ value: 'type2-ota', label: 'Type II OTA' }, { value: 'type3-ota', label: 'Type III OTA' }]}
          onChange={switchTopology}
        />
        <Segmented
          label="分析对象"
          value={viewMode}
          options={[{ value: 'compensator', label: '补偿器' }, { value: 'loop', label: '完整环路' }]}
          onChange={setViewMode}
        />
        <Segmented
          label="相位约定"
          value={phaseMode}
          options={[{ value: 'standard', label: '标准相位' }, { value: 'document', label: '文档相位' }]}
          onChange={setPhaseMode}
        />
      </section>

      <main className="workspace-grid">
        <aside className="control-column">
          <section className="panel circuit-panel">
            <div className="panel-title-row">
              <div>
                <span className="section-kicker">SCHEMATIC</span>
                <h2>补偿网络</h2>
              </div>
              <span className="topology-pill">{topology === 'type2-ota' ? '1Z · 2P' : '2Z · 3P'}</span>
            </div>
            <CircuitDiagram topology={topology} active={activeParameter} />
          </section>

          <section className="panel parameters-panel">
            <div className="panel-title-row">
              <div>
                <span className="section-kicker">COMPONENTS</span>
                <h2>元件参数</h2>
              </div>
              <button className="text-button" type="button" onClick={resetPreset}>恢复文档示例</button>
            </div>

            <div className="parameter-group">
              <h3>反馈与补偿网络</h3>
              <ParameterControl parameter="R1" label="R1 · 上分压" value={params.R1} {...resistanceProps} onChange={(value) => updateParam('R1', value)} onActive={setActiveParameter} />
              <ParameterControl parameter="R4" label="R4 · 下分压" value={params.R4} {...resistanceProps} onChange={(value) => updateParam('R4', value)} onActive={setActiveParameter} />
              {topology === 'type3-ota' && <ParameterControl parameter="R3" label="R3 · 前馈支路" value={params.R3} {...resistanceProps} onChange={(value) => updateParam('R3', value)} onActive={setActiveParameter} />}
              <ParameterControl parameter="R2" label="R2 · 补偿支路" value={params.R2} {...resistanceProps} onChange={(value) => updateParam('R2', value)} onActive={setActiveParameter} />
              <ParameterControl parameter="C1" label="C1 · 补偿电容" value={params.C1} {...capacitanceProps} onChange={(value) => updateParam('C1', value)} onActive={setActiveParameter} />
              {topology === 'type3-ota' && <ParameterControl parameter="C2" label="C2 · 前馈电容" value={params.C2} {...capacitanceProps} onChange={(value) => updateParam('C2', value)} onActive={setActiveParameter} />}
              <ParameterControl parameter="C3" label="C3 · 高频电容" value={params.C3} {...capacitanceProps} onChange={(value) => updateParam('C3', value)} onActive={setActiveParameter} />
            </div>

            <details className="device-params">
              <summary><span>OTA 器件参数</span><span className="summary-meta">gm = {engineering(params.gm, 'S')}</span></summary>
              <div className="details-body">
                <p className="helper-text">理想模型中，gm 主要平移增益曲线，不直接移动 RC 零极点。</p>
                <ParameterControl parameter="gm" label="gm · 跨导" value={params.gm} kind="conductance" min={1e-6} max={10e-3} onChange={(value) => updateParam('gm', value)} onActive={setActiveParameter} />
              </div>
            </details>

            <PlantEditor plant={plant} onChange={setPlant} />

            <details className="sweep-settings">
              <summary><span>扫频与读数</span><span className="summary-meta">{engineering(safeStart)} — {engineering(safeEnd)}</span></summary>
              <div className="details-body sweep-grid">
                <label className="compact-field"><span>起始频率</span><span className="input-with-suffix"><input type="number" min="0.000001" value={startHz} onChange={(event) => setStartHz(Math.max(1e-6, Number(event.target.value) || 1e-6))} /><em>Hz</em></span></label>
                <label className="compact-field"><span>终止频率</span><span className="input-with-suffix"><input type="number" min="0.000002" value={endHz} onChange={(event) => setEndHz(Math.max(2e-6, Number(event.target.value) || 2e-6))} /><em>Hz</em></span></label>
                <label className="compact-field"><span>读数频率</span><span className="input-with-suffix"><input type="number" min={safeStart} max={safeEnd} value={cursorHz} onChange={(event) => setCursorHz(Number(event.target.value) || safeStart)} /><em>Hz</em></span></label>
              </div>
            </details>

            <button className={`primary-button${savedPulse ? ' saved' : ''}`} type="button" onClick={setBaseline}>
              {savedPulse ? '✓ 已保存为基准' : '设为基准曲线'}
            </button>
          </section>
        </aside>

        <section className="analysis-column">
          <div className="metrics-grid">
            <MetricCard label={`${engineering(clampedCursor)} 处增益`} value={`${cursorGain.toFixed(2)} dB`} detail={viewMode === 'loop' ? '补偿器 × 功率级' : '补偿器响应'} accent="blue" />
            <MetricCard label={`${engineering(clampedCursor)} 处相位`} value={`${cursorPhase.toFixed(1)}°`} detail={phaseMode === 'standard' ? '标准负反馈约定' : '匹配文档图示'} />
            <MetricCard
              label="主交越频率"
              value={viewMode === 'loop' && result.primaryCrossover ? engineering(result.primaryCrossover.frequencyHz) : '—'}
              detail={viewMode === 'loop' ? `${result.gainCrossovers.length} 个 0 dB 交点` : '切换到完整环路查看'}
              accent="orange"
            />
            <MetricCard
              label="相位 / 增益裕量"
              value={viewMode === 'loop' && result.primaryCrossover ? `${result.primaryCrossover.phaseMarginDeg.toFixed(1)}°` : '—'}
              detail={viewMode === 'loop' ? `GM ${result.primaryGainMarginDb === null ? '未找到' : `${result.primaryGainMarginDb.toFixed(1)} dB`}` : '基于标准相位计算'}
              accent="green"
            />
          </div>

          <section className="panel chart-panel">
            <div className="panel-title-row chart-title-row">
              <div>
                <span className="section-kicker">FREQUENCY RESPONSE</span>
                <h2>{viewMode === 'loop' ? '完整环路波特图' : '补偿器波特图'}</h2>
              </div>
              <div className="curve-key" aria-label="曲线图例">
                <span><i className="line-key current" />当前</span>
                <span><i className="line-key baseline" />基准</span>
                <span><i className="marker-key zero" />零点</span>
                <span><i className="marker-key pole" />极点</span>
              </div>
            </div>
            {viewMode === 'loop' && !result.primaryCrossover && (
              <div className="inline-notice">当前扫频范围内未找到 0 dB 交越点。可调整功率级增益或扩大扫频范围。</div>
            )}
            {invalidPlantFactors > 0 && (
              <div className="inline-notice warning">有 {invalidPlantFactors} 个功率级因子参数无效，计算时已忽略。</div>
            )}
            <BodeChart result={result} baseline={baselineResult} viewMode={viewMode} phaseMode={phaseMode} plant={plant} onCursorChange={setCursorHz} />
          </section>

          <section className="panel breakpoint-panel">
            <div className="panel-title-row">
              <div>
                <span className="section-kicker">POLES & ZEROS</span>
                <h2>零极点位置</h2>
              </div>
              <span className="formula-note">按实际 RC 来源命名</span>
            </div>
            <div className="breakpoint-list">
              {result.breakpoints.map((point) => (
                <div className={`breakpoint-item ${point.kind}`} key={point.id}>
                  <span className="breakpoint-symbol">{point.kind === 'zero' ? 'Z' : 'P'}</span>
                  <div><strong>{point.label}</strong><small>{point.source}</small></div>
                  <b>{engineering(point.frequencyHz)}</b>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>

      <footer>
        <p>计算采用理想 OTA 小信号模型，不包含输出限幅、输出电阻、器件容差与温漂。</p>
        <span>Type II / Type III OTA · Interactive Bode Explorer</span>
      </footer>
    </div>
  )
}
