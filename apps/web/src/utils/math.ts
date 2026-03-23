export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

export function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

export function formatSigned(value: number) {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2)
}

export function formatNumber(value: number, digits = 2) {
  return value.toFixed(digits)
}

export function formatCount(value: number) {
  return value.toLocaleString('en-US')
}

export function safeDivide(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0
  }
  return numerator / denominator
}

export function mulberry32(seed: number) {
  let next = seed
  return function random() {
    next += 0x6d2b79f5
    let t = next
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function normalRandom(random: () => number) {
  const u1 = Math.max(random(), 1e-12)
  const u2 = random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export function erf(x: number) {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax))
  return sign * y
}

export function normalPdf(x: number, mean = 0, sd = 1) {
  const z = (x - mean) / sd
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI))
}

export function normalCdf(x: number, mean = 0, sd = 1) {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.sqrt(2))))
}

export function choose(n: number, k: number) {
  if (k < 0 || k > n) {
    return 0
  }
  let result = 1
  const limit = Math.min(k, n - k)
  for (let index = 1; index <= limit; index += 1) {
    result *= (n - limit + index) / index
  }
  return result
}

export function buildPolyline(
  points: Array<{ x: number; y: number }>,
  xScale: (value: number) => number,
  yScale: (value: number) => number,
) {
  return points.map((point) => `${xScale(point.x)},${yScale(point.y)}`).join(' ')
}

export function linspace(start: number, end: number, count: number) {
  const step = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, i) => start + i * step)
}

export function mean(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

export function variance(values: number[], sample = true) {
  if (values.length < 2) return 0
  const m = mean(values)
  const ss = values.reduce((s, v) => s + (v - m) ** 2, 0)
  return ss / (sample ? values.length - 1 : values.length)
}

export function stdDev(values: number[], sample = true) {
  return Math.sqrt(variance(values, sample))
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) return 0
  if (n % 2 === 1) return sorted[(n - 1) / 2]
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2
}

export function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b)
  const pos = q * (sorted.length - 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function covariance(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return 0
  const mx = mean(xs)
  const my = mean(ys)
  let ss = 0
  for (let i = 0; i < n; i++) {
    ss += (xs[i] - mx) * (ys[i] - my)
  }
  return ss / (n - 1)
}

export function correlation(xs: number[], ys: number[]) {
  const sx = stdDev(xs)
  const sy = stdDev(ys)
  if (sx === 0 || sy === 0) return 0
  return covariance(xs, ys) / (sx * sy)
}

export function linearRegression(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length)
  const mx = mean(xs)
  const my = mean(ys)
  let ssXX = 0
  let ssXY = 0
  for (let i = 0; i < n; i++) {
    ssXX += (xs[i] - mx) ** 2
    ssXY += (xs[i] - mx) * (ys[i] - my)
  }
  const slope = ssXX === 0 ? 0 : ssXY / ssXX
  const intercept = my - slope * mx
  const predicted = xs.map((x) => intercept + slope * x)
  const residuals = ys.map((y, i) => y - predicted[i])
  const ssRes = residuals.reduce((s, r) => s + r * r, 0)
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0)
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, rSquared, predicted, residuals }
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = matrix.length
  if (n === 0 || vector.length !== n) {
    return [] as number[]
  }

  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]])

  for (let pivotIndex = 0; pivotIndex < n; pivotIndex += 1) {
    let maxRow = pivotIndex
    for (let rowIndex = pivotIndex + 1; rowIndex < n; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = rowIndex
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-12) {
      return Array.from({ length: n }, () => 0)
    }

    if (maxRow !== pivotIndex) {
      const temp = augmented[pivotIndex]
      augmented[pivotIndex] = augmented[maxRow]
      augmented[maxRow] = temp
    }

    const pivot = augmented[pivotIndex][pivotIndex]
    for (let colIndex = pivotIndex; colIndex <= n; colIndex += 1) {
      augmented[pivotIndex][colIndex] /= pivot
    }

    for (let rowIndex = 0; rowIndex < n; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue
      }
      const factor = augmented[rowIndex][pivotIndex]
      for (let colIndex = pivotIndex; colIndex <= n; colIndex += 1) {
        augmented[rowIndex][colIndex] -= factor * augmented[pivotIndex][colIndex]
      }
    }
  }

  return augmented.map((row) => row[n])
}

function invertMatrix(matrix: number[][]) {
  const n = matrix.length
  if (n === 0) {
    return [] as number[][]
  }

  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...Array.from({ length: n }, (_, colIndex) => (rowIndex === colIndex ? 1 : 0)),
  ])

  for (let pivotIndex = 0; pivotIndex < n; pivotIndex += 1) {
    let maxRow = pivotIndex
    for (let rowIndex = pivotIndex + 1; rowIndex < n; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = rowIndex
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-12) {
      return Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
    }

    if (maxRow !== pivotIndex) {
      const temp = augmented[pivotIndex]
      augmented[pivotIndex] = augmented[maxRow]
      augmented[maxRow] = temp
    }

    const pivot = augmented[pivotIndex][pivotIndex]
    for (let colIndex = 0; colIndex < 2 * n; colIndex += 1) {
      augmented[pivotIndex][colIndex] /= pivot
    }

    for (let rowIndex = 0; rowIndex < n; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue
      }
      const factor = augmented[rowIndex][pivotIndex]
      for (let colIndex = 0; colIndex < 2 * n; colIndex += 1) {
        augmented[rowIndex][colIndex] -= factor * augmented[pivotIndex][colIndex]
      }
    }
  }

  return augmented.map((row) => row.slice(n))
}

export function multipleRegression(predictors: number[][], ys: number[]) {
  const n = Math.min(predictors.length, ys.length)
  if (n === 0) {
    return {
      coefficients: [] as number[],
      standardErrors: [] as number[],
      predicted: [] as number[],
      residuals: [] as number[],
      rSquared: 0,
    }
  }

  const featureCount = predictors[0]?.length ?? 0
  const design = predictors.slice(0, n).map((row) => [1, ...row.slice(0, featureCount)])
  const y = ys.slice(0, n)
  const parameterCount = featureCount + 1

  const xtx = Array.from({ length: parameterCount }, () => Array.from({ length: parameterCount }, () => 0))
  const xty = Array.from({ length: parameterCount }, () => 0)

  for (let rowIndex = 0; rowIndex < n; rowIndex += 1) {
    const row = design[rowIndex]
    for (let left = 0; left < parameterCount; left += 1) {
      xty[left] += row[left] * y[rowIndex]
      for (let right = 0; right < parameterCount; right += 1) {
        xtx[left][right] += row[left] * row[right]
      }
    }
  }

  const coefficients = solveLinearSystem(xtx, xty)
  const predicted = design.map((row) =>
    row.reduce((sum, value, index) => sum + value * (coefficients[index] ?? 0), 0),
  )
  const residuals = y.map((value, index) => value - predicted[index])
  const yMean = mean(y)
  const ssRes = residuals.reduce((sum, value) => sum + value * value, 0)
  const ssTot = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0)
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  const dof = Math.max(1, n - parameterCount)
  const sigmaSquared = ssRes / dof
  const inverse = invertMatrix(xtx)
  const standardErrors = inverse.map((row, index) => Math.sqrt(Math.max(row[index], 0) * sigmaSquared))

  return {
    coefficients,
    standardErrors,
    predicted,
    residuals,
    rSquared,
  }
}
