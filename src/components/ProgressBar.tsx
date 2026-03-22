interface ProgressBarProps {
  progress: number;
  isProcessing: boolean;
}

export function ProgressBar({ progress, isProcessing }: ProgressBarProps) {
  if (!isProcessing) return null;

  return (
    <div className="mt-4">
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-600 mt-2">
        正在识别，请稍候... {progress}%
      </p>
    </div>
  );
}
