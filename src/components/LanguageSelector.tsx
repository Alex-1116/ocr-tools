import React from 'react';
import { Language, LANGUAGE_OPTIONS } from '../types';

interface LanguageSelectorProps {
  value: Language;
  onChange: (language: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">选择语言</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="w-full p-3 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
