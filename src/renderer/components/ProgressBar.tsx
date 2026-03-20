interface ProgressBarProps {
  progress: number
  status: string
}

function ProgressBar({ progress, status }: ProgressBarProps) {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-info">
        <span className="progress-text">{progress}%</span>
        <span className="progress-status">{status}</span>
      </div>
    </div>
  )
}

export default ProgressBar
