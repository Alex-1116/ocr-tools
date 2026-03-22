interface RecognizeButtonProps {
  onClick: () => void;
  disabled: boolean;
  isProcessing: boolean;
  progress: number;
}

export function RecognizeButton({
  onClick,
  disabled,
  isProcessing,
  progress,
}: RecognizeButtonProps) {
  return (
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
  );
}
