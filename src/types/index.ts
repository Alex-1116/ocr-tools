export type Language = 'chi_sim' | 'chi_tra' | 'eng' | 'jpn' | 'kor' | 'chi_sim+eng';

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'chi_sim', label: '中文简体' },
  { value: 'chi_tra', label: '中文繁体' },
  { value: 'eng', label: '英文' },
  { value: 'jpn', label: '日文' },
  { value: 'kor', label: '韩文' },
  { value: 'chi_sim+eng', label: '中英混合' },
];

export interface OCRResult {
  text: string;
  confidence: number;
}
