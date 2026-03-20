import { useRef, useCallback, DragEvent, ChangeEvent, ClipboardEvent } from 'react'

interface ImageUploaderProps {
  image: string | null
  onImageSelect: (imageData: string) => void
  disabled: boolean
}

function ImageUploader({ image, onImageSelect, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.match(/^image\/(png|jpe?g|bmp)$/)) {
        alert('请上传 PNG、JPG、JPEG 或 BMP 格式的图片')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelect(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    },
    [onImageSelect]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, handleFile]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      if (disabled) return

      const items = e.clipboardData.items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleFile(file)
            break
          }
        }
      }
    },
    [disabled, handleFile]
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  return (
    <div
      className={`image-uploader ${disabled ? 'disabled' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPaste={handlePaste}
      onClick={handleClick}
      tabIndex={0}
    >
      {image ? (
        <img src={image} alt="预览" className="preview-image" />
      ) : (
        <div className="placeholder">
          <div className="placeholder-icon">📷</div>
          <p>拖拽图片到此处</p>
          <p>或点击上传图片</p>
          <p className="hint">支持 Ctrl+V 粘贴图片</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/bmp"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default ImageUploader
