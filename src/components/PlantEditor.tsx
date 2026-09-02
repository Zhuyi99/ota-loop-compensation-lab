import type { PlantFactor, PlantModel } from '../types'

interface PlantEditorProps {
  plant: PlantModel
  onChange: (plant: PlantModel) => void
}

function makeFactor(kind: PlantFactor['kind']): PlantFactor {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    kind,
    shape: 'real',
    frequencyHz: kind === 'pole' ? 1e3 : 10e3,
    q: 0.707,
  }
}

export function PlantEditor({ plant, onChange }: PlantEditorProps) {
  const updateFactor = (id: string, patch: Partial<PlantFactor>) => {
    onChange({
      ...plant,
      factors: plant.factors.map((factor) => factor.id === id ? { ...factor, ...patch } : factor),
    })
  }

  const removeFactor = (id: string) => {
    onChange({ ...plant, factors: plant.factors.filter((factor) => factor.id !== id) })
  }

  return (
    <details className="plant-editor">
      <summary>
        <span>功率级模型</span>
        <span className="summary-meta">{plant.factors.length} 个因子</span>
      </summary>
      <div className="details-body">
        <p className="helper-text">演示预设并非附件参数。请按实际功率级修改零极点与 DC 增益。</p>
        <label className="compact-field">
          <span>DC 增益</span>
          <span className="input-with-suffix">
            <input
              type="number"
              step="0.1"
              value={plant.gainDb}
              onChange={(event) => onChange({ ...plant, gainDb: Number(event.target.value) || 0 })}
            />
            <em>dB</em>
          </span>
        </label>

        <div className="factor-list">
          {plant.factors.map((factor, index) => {
            const invalidFrequency = !(factor.frequencyHz > 0)
            const invalidQ = factor.shape === 'second-order' && !(factor.q > 0)
            return (
              <div className={`factor-row${invalidFrequency || invalidQ ? ' invalid' : ''}`} key={factor.id}>
                <div className="factor-index">{index + 1}</div>
                <select
                  aria-label={`因子 ${index + 1} 类型`}
                  value={factor.kind}
                  onChange={(event) => updateFactor(factor.id, { kind: event.target.value as PlantFactor['kind'] })}
                >
                  <option value="pole">极点</option>
                  <option value="zero">零点</option>
                </select>
                <select
                  aria-label={`因子 ${index + 1} 阶数`}
                  value={factor.shape}
                  onChange={(event) => updateFactor(factor.id, { shape: event.target.value as PlantFactor['shape'] })}
                >
                  <option value="real">一阶</option>
                  <option value="second-order">二阶</option>
                </select>
                <label>
                  <span>频率 Hz</span>
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={factor.frequencyHz}
                    onChange={(event) => updateFactor(factor.id, { frequencyHz: Number(event.target.value) })}
                  />
                </label>
                {factor.shape === 'second-order' && (
                  <label>
                    <span>Q</span>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={factor.q}
                      onChange={(event) => updateFactor(factor.id, { q: Number(event.target.value) })}
                    />
                  </label>
                )}
                <button className="icon-button" type="button" aria-label={`删除因子 ${index + 1}`} onClick={() => removeFactor(factor.id)}>×</button>
                {(invalidFrequency || invalidQ) && <small>频率与 Q 必须大于 0；该因子已暂时忽略。</small>}
              </div>
            )
          })}
        </div>

        <div className="factor-actions">
          <button type="button" className="secondary-button" onClick={() => onChange({ ...plant, factors: [...plant.factors, makeFactor('pole')] })}>＋ 添加极点</button>
          <button type="button" className="secondary-button" onClick={() => onChange({ ...plant, factors: [...plant.factors, makeFactor('zero')] })}>＋ 添加零点</button>
          <button type="button" className="text-button danger" onClick={() => onChange({ ...plant, factors: [] })}>清空因子</button>
        </div>
      </div>
    </details>
  )
}
