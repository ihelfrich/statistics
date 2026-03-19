import { round3 } from '../utils/math.ts'

export function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  note,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  note: string
  onChange: (value: number) => void
}) {
  return (
    <label className="slider-control">
      <div className="slider-row">
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(round3(Number(event.target.value)))}
      />
      <small>{note}</small>
    </label>
  )
}
