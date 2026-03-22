import { useRef } from 'react';

interface ImageUploaderProps {
  image: string | null;
  isDragging: boolean;
  onFileUpload: (file: File) => void;
  onElectronFileDialog: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemoveImage: () => void;
}

export function ImageUploader({
  image,
  isDragging,
  onFileUpload,
  onElectronFileDialog,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemoveImage,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (window.electronAPI) {
      onElectronFileDialog();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 transform ${
        isDragging
          ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg'
          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:scale-[1.01]'
      }`}
    >
      {image ? (
        <div className="relative">
          <img
            src={image}
            alt="Uploaded"
            className="max-w-full max-h-64 mx-auto rounded-lg object-contain shadow-md"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveImage();
            }}
            className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors shadow-lg"
          >
            移除
          </button>
        </div>
      ) : (
        <div>
          <div className="text-5xl mb-4">📷</div>
          <p className="text-lg mb-2 text-gray-700">点击上传或拖拽图片到此处</p>
          <p className="text-sm text-gray-500">支持 PNG、JPG、JPEG、BMP 格式</p>
          <p className="text-sm text-gray-500 mt-2">或使用 Ctrl+V 粘贴图片</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/bmp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileUpload(file);
        }}
        className="hidden"
      />
    </div>
  );
}
