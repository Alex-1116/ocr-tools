import React from 'react';

interface RecognizeButtonProps {
  disabled: boolean;
  isProcessing: boolean;
  progress: number;
  onClick: () => void;
}

export const RecognizeButton: React.FC<RecognizeButtonProps> = ({
  disabled,
  isProcessing,
  progress,
  onClick,
}) => {
  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full mt-4 py-3 rounded-lg font-semibold transition-all ${
          disabled
            ? 'bg-secondary text-white cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary-dark'
        }`}
      >
        {isProcessing ? `识别中... ${progress}%` : '一键识别'}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-text-muted mt-2">正在识别，请稍候...</p>
        </div>
      )}
    </>
  );
};
