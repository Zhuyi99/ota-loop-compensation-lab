/// <reference types="vite/client" />

declare module 'plotly.js-basic-dist-min' {
  import type { PlotlyHTMLElement } from 'plotly.js'
  const Plotly: {
    newPlot: (...args: unknown[]) => Promise<PlotlyHTMLElement>
    react: (...args: unknown[]) => Promise<PlotlyHTMLElement>
    purge: (root: HTMLElement) => void
  }
  export default Plotly
}
