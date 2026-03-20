import { ChangeEvent } from 'react'
import { Language } from '../App'

interface LanguageSelectorProps {
  languages: Language[]
  selected: string
  onChange: (lang: string) => void
  disabled: boolean
}

function LanguageSelector({ languages, selected, onChange, disabled }: LanguageSelectorProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="language-selector">
      <label htmlFor="language">识别语言：</label>
      <select
        id="language"
        value={selected}
        onChange={handleChange}
        disabled={disabled}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector
