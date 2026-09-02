export interface Complex {
  re: number
  im: number
}

export const complex = (re: number, im = 0): Complex => ({ re, im })

export const add = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
})

export const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
})

export const scale = (a: Complex, scalar: number): Complex => ({
  re: a.re * scalar,
  im: a.im * scalar,
})

export const divide = (a: Complex, b: Complex): Complex => {
  const denominator = b.re * b.re + b.im * b.im
  return {
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator,
  }
}

export const magnitude = (value: Complex): number => Math.hypot(value.re, value.im)
export const phaseDeg = (value: Complex): number => (Math.atan2(value.im, value.re) * 180) / Math.PI
