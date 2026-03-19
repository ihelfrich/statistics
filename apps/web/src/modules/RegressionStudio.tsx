import { useState, useMemo } from 'react'
import { ModuleHeader, MetricCard, Slider } from '../components/index.ts'
import {
  formatNumber,
  mulberry32,
  normalRandom,
  mean,
  stdDev,
  linearRegression,
} from '../utils/math.ts'

export function RegressionStudio() {
  const [trueBeta0, setTrueBeta0] = useState(10)
  const [trueBeta1, setTrueBeta1] = useState(2.5)
  const [noiseSD, setNoiseSD] = useState(8)
  const [sampleSize, setSampleSize] = useState(40)
  const [seed, setSeed] = useState(55)
  const [showResiduals, setShowResiduals] = useState(false)

  const { xs, ys } = useMemo(() => {
    const rng = mulberry32(seed)
    const xVals = Array.from({ length: sampleSize }, () => rng() * 30 + 5)
    const yVals = xVals.map((x) => trueBeta0 + trueBeta1 * x + normalRandom(rng) * noiseSD)
    return { xs: xVals, ys: yVals }
  }, [trueBeta0, trueBeta1, noiseSD, sampleSize, seed])

  const reg = linearRegression(xs, ys)
  const residSD = stdDev(reg.residuals)
  const mx = mean(xs)
  const my = mean(ys)

  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys, ...reg.predicted)
  const yMax = Math.max(...ys, ...reg.predicted)
  const padX = (xMax - xMin) * 0.1 || 5
  const padY = (yMax - yMin) * 0.1 || 5
  const dxL = xMin - padX
  const dxR = xMax + padX
  const dyL = yMin - padY
  const dyR = yMax + padY

  const toSvgX = (v: number) => 70 + ((v - dxL) / (dxR - dxL)) * 480
  const toSvgY = (v: number) => 230 - ((v - dyL) / (dyR - dyL)) * 190

  const regX1 = dxL
  const regX2 = dxR
  const regY1 = reg.intercept + reg.slope * regX1
  const regY2 = reg.intercept + reg.slope * regX2

  const residBins = (() => {
    const sorted = [...reg.residuals].sort((a, b) => a - b)
    const binCount = Math.min(Math.ceil(Math.sqrt(sampleSize)), 15)
    const lo = sorted[0]
    const hi = sorted[sorted.length - 1]
    const w = (hi - lo) / binCount || 1
    const bins = Array.from({ length: binCount }, (_, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w, count: 0 }))
    for (const rv of sorted) {
      const idx = Math.min(Math.floor((rv - lo) / w), binCount - 1)
      bins[idx].count++
    }
    return bins
  })()
  const maxResidBin = Math.max(...residBins.map((b) => b.count), 1)

  return (
    <div className="stack-layout">
      <section className="content-card">
        <ModuleHeader
          kicker="Linear regression"
          title="Fit, predict, diagnose"
          description="OLS finds the line that minimizes squared residuals. Adjust the true data-generating process and see how the fit responds."
        />
        <div className="module-grid narrow-sidebar">
          <aside className="control-card">
            <Slider label="True intercept β₀" value={trueBeta0} min={-20} max={40} step={1} display={String(trueBeta0)} note="Population intercept." onChange={(v) => setTrueBeta0(Math.round(v))} />
            <Slider label="True slope β₁" value={trueBeta1} min={-5} max={5} step={0.1} display={formatNumber(trueBeta1, 1)} note="Population slope." onChange={setTrueBeta1} />
            <Slider label="Noise σ" value={noiseSD} min={1} max={30} step={1} display={String(noiseSD)} note="Standard deviation of errors." onChange={(v) => setNoiseSD(Math.round(v))} />
            <Slider label="Sample size" value={sampleSize} min={10} max={120} step={5} display={String(sampleSize)} note="Number of observations." onChange={(v) => setSampleSize(Math.round(v))} />
            <div className="choice-row">
              <span>View</span>
              <div className="choice-buttons">
                <button type="button" className={`mini-choice ${!showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(false)}>Scatter + fit</button>
                <button type="button" className={`mini-choice ${showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(true)}>Residuals</button>
              </div>
            </div>
            <div className="button-stack">
              <button type="button" className="primary-button" onClick={() => setSeed((c) => c + 1)}>Generate new data</button>
            </div>
          </aside>

          <div className="module-content">
            <div className="metric-strip wide">
              <MetricCard value={formatNumber(reg.intercept, 2)} label="β̂₀ (intercept)" />
              <MetricCard value={formatNumber(reg.slope, 3)} label="β̂₁ (slope)" />
              <MetricCard value={formatNumber(reg.rSquared, 3)} label="R²" />
              <MetricCard value={formatNumber(residSD, 2)} label="residual SD" />
            </div>

            <section className="content-card inset">
              <h3>{showResiduals ? 'Residual plot' : 'Scatter plot with OLS line'}</h3>
              <p>
                {showResiduals
                  ? 'Residuals should scatter randomly around zero with constant spread. Patterns indicate model problems.'
                  : 'The orange dashed line is the least-squares fit. The orange dot marks (x̄, ȳ), which the line always passes through.'}
              </p>
              <svg viewBox="0 0 600 280" className="chart-svg" role="img" aria-label={showResiduals ? 'Residual plot' : 'Regression scatter'}>
                <rect x="0" y="0" width="600" height="280" rx="24" className="chart-frame" />
                {showResiduals ? (
                  <>
                    <line x1="70" y1="140" x2="550" y2="140" stroke="rgba(19,34,71,0.2)" strokeWidth="1.5" strokeDasharray="6 4" />
                    {xs.map((x, i) => (
                      <circle key={i} cx={toSvgX(x)} cy={140 - (reg.residuals[i] / (residSD * 3)) * 90} r="4" fill="rgba(45,96,176,0.5)" stroke="rgba(45,96,176,0.8)" strokeWidth="1.5" />
                    ))}
                    <text x="26" y="28" className="chart-caption">residual</text>
                    <text x="530" y="250" className="axis-label">x</text>
                  </>
                ) : (
                  <>
                    <line x1="70" y1="230" x2="550" y2="230" stroke="rgba(19,34,71,0.1)" strokeWidth="1" />
                    <line x1="70" y1="40" x2="70" y2="230" stroke="rgba(19,34,71,0.1)" strokeWidth="1" />
                    <line x1={toSvgX(regX1)} y1={toSvgY(regY1)} x2={toSvgX(regX2)} y2={toSvgY(regY2)} stroke="rgba(225,86,42,0.7)" strokeWidth="2.5" strokeDasharray="8 6" />
                    {xs.map((x, i) => (
                      <circle key={i} cx={toSvgX(x)} cy={toSvgY(ys[i])} r="4" fill="rgba(45,96,176,0.5)" stroke="rgba(45,96,176,0.8)" strokeWidth="1.5" />
                    ))}
                    <circle cx={toSvgX(mx)} cy={toSvgY(my)} r="6" fill="rgba(225,86,42,0.9)" stroke="white" strokeWidth="2" />
                    <text x="26" y="28" className="chart-caption">y</text>
                    <text x="530" y="250" className="axis-label">x</text>
                  </>
                )}
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Residual distribution</h3>
              <p>If the model is well specified, residuals should look roughly normal with mean zero.</p>
              <svg viewBox="0 0 600 200" className="chart-svg" role="img" aria-label="Residual histogram">
                <rect x="0" y="0" width="600" height="200" rx="24" className="chart-frame" />
                {residBins.map((bin, i) => {
                  const bw = 480 / residBins.length
                  const h = 120 * (bin.count / maxResidBin)
                  const x = 60 + i * bw
                  return <rect key={i} x={x} y={160 - h} width={Math.max(bw - 3, 3)} height={h} className="hist-bar" rx="4" />
                })}
                <text x="26" y="24" className="chart-caption">count</text>
              </svg>
            </section>

            <section className="content-card inset">
              <h3>Interpretation</h3>
              <div className="explanation-panel">
                <code>ŷ = {formatNumber(reg.intercept, 2)} + {formatNumber(reg.slope, 3)}·x</code>
                <p className="strong-text">
                  R² = {formatNumber(reg.rSquared, 3)} — the model explains {formatNumber(reg.rSquared * 100, 1)}% of the variation in y.
                </p>
                <p>
                  For every 1-unit increase in x, ŷ changes by {formatNumber(reg.slope, 3)}.
                  The residual standard deviation is {formatNumber(residSD, 2)}, compared to the noise σ = {noiseSD} you set.
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
