interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            className={value === option.value ? 'selected' : ''}
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
