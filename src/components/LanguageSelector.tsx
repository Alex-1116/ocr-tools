import './LanguageSelector.css'
import type { Language, LanguageOption } from '../constants/languages'

interface LanguageSelectorProps {
  languages: LanguageOption[]
  selected: Language
  onChange: (language: Language) => void
  disabled?: boolean
}

function LanguageSelector({ languages, selected, onChange, disabled }: LanguageSelectorProps) {
  return (
    <div className="language-selector">
      <div className="language-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>识别语言</span>
      </div>
      <div className="language-options">
        {languages.map((lang) => (
          <button
            key={lang.value}
            className={`language-option ${selected === lang.value ? 'selected' : ''}`}
            onClick={() => onChange(lang.value)}
            disabled={disabled}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default LanguageSelector
