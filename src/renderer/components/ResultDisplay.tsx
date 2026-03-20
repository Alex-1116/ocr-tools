import { ChangeEvent } from 'react'

interface ResultDisplayProps {
  result: string
  onChange: (text: string) => void
}

function ResultDisplay({ result, onChange }: ResultDisplayProps) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="result-display">
      <label>识别结果：</label>
      <textarea
        value={result}
        onChange={handleChange}
        placeholder="识别结果将显示在这里..."
        spellCheck={false}
      />
    </div>
  )
}

export default ResultDisplay
