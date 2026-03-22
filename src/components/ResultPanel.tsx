import React, { useRef } from 'react';

interface ResultPanelProps {
  result: string;
  onResultChange: (value: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onClear: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  onResultChange,
  onCopy,
  onSave,
  onClear,
}) => {
  const resultRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="bg-surface rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">识别结果</h2>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            disabled={!result}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-secondary disabled:cursor-not-allowed transition-colors text-sm"
          >
            复制
          </button>
          <button
            onClick={onSave}
            disabled={!result}
            className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-600 disabled:bg-secondary disabled:cursor-not-allowed transition-colors text-sm"
          >
            保存
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 bg-error text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
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
        className="w-full h-80 p-4 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
      />

      <div className="mt-4 flex justify-between items-center text-sm text-text-muted">
        <span>字符数: {result.length}</span>
        <span>行数: {result ? result.split('\n').filter(line => line.trim()).length : 0}</span>
      </div>
    </div>
  );
};
