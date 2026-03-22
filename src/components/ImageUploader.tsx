import { RefObject } from 'react';

interface ImageUploaderProps {
  image: string | null;
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onClick: () => void;
}

export function ImageUploader({
  image,
  isDragging,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onClear,
  onClick,
}: ImageUploaderProps) {
  return (
    <div
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary hover:bg-primary/5'
      }`}
    >
      {image ? (
        <div className="relative">
          <img
            src={image}
            alt="Uploaded"
            className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute top-2 right-2 bg-error text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors"
          >
            移除
          </button>
        </div>
      ) : (
        <div>
          <div className="text-5xl mb-4">📷</div>
          <p className="text-lg mb-2">点击上传或拖拽图片到此处</p>
          <p className="text-sm text-text-muted">支持 PNG、JPG、JPEG、BMP 格式</p>
          <p className="text-sm text-text-muted mt-2">或使用 Ctrl+V 粘贴图片</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/bmp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        className="hidden"
      />
    </div>
  );
}
