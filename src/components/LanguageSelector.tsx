import { Language, LANGUAGE_OPTIONS } from '../types';

interface LanguageSelectorProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export function LanguageSelector({ language, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2 text-gray-700">选择语言</label>
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
