export function ChoiceRow<T extends number | string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ label: string; value: T }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="choice-row">
      <span>{label}</span>
      <div className="choice-buttons">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`mini-choice ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
