import { useRef } from 'react';

interface ResultDisplayProps {
  result: string;
  onResultChange: (text: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onClear: () => void;
}

export function ResultDisplay({ result, onResultChange, onCopy, onSave, onClear }: ResultDisplayProps) {
  const resultRef = useRef<HTMLTextAreaElement>(null);

  const charCount = result.length;
  const lineCount = result ? result.split('\n').filter(line => line.trim()).length : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">识别结果</h2>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            disabled={!result}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
          >
            复制
          </button>
          <button
            onClick={onSave}
            disabled={!result}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
          >
            保存
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
          >
            清空
          </button>
        </div>
      </div>

      <textarea
        ref={resultRef}
        value={result}
        onChange={(e) => onResultChange(e.target.value)}
        placeholder="识别结果将显示在这里..."
        className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-800 font-sans"
      />

      <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
        <span>字符数: {charCount}</span>
        <span>行数: {lineCount}</span>
      </div>
    </div>
  );
}
