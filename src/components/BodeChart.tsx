import { useMemo } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-basic-dist-min'
import type { BodeResult, PhaseMode, PlantModel, ViewMode } from '../types'

const Plot = createPlotlyComponent(Plotly as never)

interface BodeChartProps {
  result: BodeResult
  baseline: BodeResult
  viewMode: ViewMode
  phaseMode: PhaseMode
  plant: PlantModel
  onCursorChange: (frequencyHz: number) => void
}

export function BodeChart({ result, baseline, viewMode, phaseMode, plant, onCursorChange }: BodeChartProps) {
  const current = viewMode === 'compensator' ? result.compensator : result.loop
  const reference = viewMode === 'compensator' ? baseline.compensator : baseline.loop
  const phaseKey = phaseMode === 'standard' ? 'phaseStandardDeg' : 'phaseDocumentDeg'
  const currentPhase = current[phaseKey]
  const referencePhase = reference[phaseKey]

  const plotData = useMemo(() => {
    const traces: Record<string, unknown>[] = [
      {
        x: result.frequenciesHz,
        y: reference.magnitudeDb,
        name: '基准 · 增益',
        type: 'scatter',
        mode: 'lines',
        xaxis: 'x',
        yaxis: 'y',
        hoverinfo: 'skip',
        line: { color: '#a1a1a6', width: 1.6, dash: 'dot' },
      },
      {
        x: result.frequenciesHz,
        y: current.magnitudeDb,
        name: '当前 · 增益',
        type: 'scatter',
        mode: 'lines',
        xaxis: 'x',
        yaxis: 'y',
        line: { color: '#0071e3', width: 2.7 },
        hovertemplate: '<b>%{x:.4~s} Hz</b><br>%{y:.2f} dB<extra>当前增益</extra>',
      },
      {
        x: result.frequenciesHz,
        y: referencePhase,
        name: '基准 · 相位',
        type: 'scatter',
        mode: 'lines',
        xaxis: 'x',
        yaxis: 'y2',
        hoverinfo: 'skip',
        showlegend: false,
        line: { color: '#a1a1a6', width: 1.6, dash: 'dot' },
      },
      {
        x: result.frequenciesHz,
        y: currentPhase,
        name: '当前 · 相位',
        type: 'scatter',
        mode: 'lines',
        xaxis: 'x',
        yaxis: 'y2',
        showlegend: false,
        line: { color: '#0071e3', width: 2.7 },
        hovertemplate: '<b>%{x:.4~s} Hz</b><br>%{y:.2f}°<extra>当前相位</extra>',
      },
    ]

    if (viewMode === 'loop' && result.gainCrossovers.length) {
      traces.push({
        x: result.gainCrossovers.map((crossing) => crossing.frequencyHz),
        y: result.gainCrossovers.map(() => 0),
        name: '0 dB 交越',
        type: 'scatter',
        mode: 'markers',
        xaxis: 'x',
        yaxis: 'y',
        marker: { color: '#ff9f0a', size: 9, line: { color: '#fff', width: 2 } },
        hovertemplate: '<b>%{x:.4~s} Hz</b><br>0 dB<extra>环路交越</extra>',
      })
    }
    return traces
  }, [baseline, current.magnitudeDb, currentPhase, reference.magnitudeDb, referencePhase, result, viewMode])

  const markers = [
    ...result.breakpoints.map((point) => ({
      frequencyHz: point.frequencyHz,
      label: point.kind === 'zero' ? `Z · ${point.source}` : `P · ${point.source}`,
      kind: point.kind,
    })),
    ...(viewMode === 'loop' ? plant.factors.filter((factor) => factor.frequencyHz > 0).map((factor) => ({
      frequencyHz: factor.frequencyHz,
      label: `功率级${factor.kind === 'zero' ? 'Z' : 'P'}${factor.shape === 'second-order' ? '²' : ''}`,
      kind: factor.kind,
    })) : []),
  ].filter((marker) => marker.frequencyHz >= result.frequenciesHz[0] && marker.frequencyHz <= result.frequenciesHz.at(-1)!)

  const layout = useMemo(() => ({
    autosize: true,
    margin: { l: 64, r: 24, t: 58, b: 58 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#ffffff',
    font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif', color: '#3a3a3c', size: 12 },
    hovermode: 'x unified' as const,
    dragmode: 'zoom' as const,
    showlegend: false,
    xaxis: {
      type: 'log' as const,
      anchor: 'y2' as const,
      title: { text: '频率 (Hz)', standoff: 14 },
      gridcolor: '#e5e5ea',
      minor: { gridcolor: '#f2f2f7', showgrid: true },
      zeroline: false,
      showline: true,
      linecolor: '#d1d1d6',
      mirror: true,
      exponentformat: 'SI' as const,
    },
    yaxis: {
      domain: [0.56, 1],
      title: { text: '增益 (dB)' },
      gridcolor: '#e5e5ea',
      zeroline: false,
      showline: true,
      linecolor: '#d1d1d6',
      mirror: true,
    },
    yaxis2: {
      domain: [0, 0.43],
      title: { text: '相位 (°)' },
      gridcolor: '#e5e5ea',
      zeroline: false,
      showline: true,
      linecolor: '#d1d1d6',
      mirror: true,
    },
    shapes: [
      { type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: 0, y1: 0, line: { color: '#ff9f0a', width: 1, dash: 'dash' } },
      ...markers.map((marker) => ({
        type: 'line',
        xref: 'x',
        x0: marker.frequencyHz,
        x1: marker.frequencyHz,
        yref: 'paper',
        y0: 0,
        y1: 1,
        line: { color: marker.kind === 'zero' ? '#30b46b' : '#af52de', width: 1, dash: 'dot' },
      })),
    ],
    uirevision: `${viewMode}-${phaseMode}`,
  }), [markers, phaseMode, viewMode])

  return (
    <div className="chart-shell">
      <Plot
        data={plotData as never[]}
        layout={layout as never}
        config={{
          responsive: true,
          displaylogo: false,
          scrollZoom: true,
          modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
          toImageButtonOptions: { format: 'svg', filename: 'ota-bode-plot', scale: 1 },
        }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        onClick={(event) => {
          const x = Number(event.points?.[0]?.x)
          if (Number.isFinite(x) && x > 0) onCursorChange(x)
        }}
      />
      <div className="chart-hint">滚轮缩放 · 框选局部 · 双击复位 · 点击曲线设置读数频率</div>
    </div>
  )
}
