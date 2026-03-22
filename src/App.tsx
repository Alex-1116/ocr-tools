import { useEffect, useCallback } from 'react';
import { useOCR } from './hooks/useOCR';
import { LanguageSelector } from './components/LanguageSelector';
import { ImageUploader } from './components/ImageUploader';
import { ProgressBar } from './components/ProgressBar';
import { ResultDisplay } from './components/ResultDisplay';
function App() {
 const { image, result, isProcessing, progress, language, isDragging, setLanguage, setResult, handleFileUpload, handleElectronFileDialog, handleDrop, handleDragOver, handleDragLeave, recognizeText, copyResult, saveToFile, clearAll, removeImage, } = useOCR();
 const handlePaste = useCallback((e: ClipboardEvent) => {
 const items = e.clipboardData?.items;
 if (!items)
 return;
 for (let i = 0; i < items.length; i++) {
 if (items[i].type.startsWith('image/')) {
 const file = items[i].getAsFile();
 if (file) {
 handleFileUpload(file);
 }
 break;
 }
 }
 }, [handleFileUpload]);
 useEffect(() => {
 window.addEventListener('paste', handlePaste);
 return () => window.removeEventListener('paste', handlePaste);
 }, [handlePaste]);
 return (<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
 <div className="max-w-6xl mx-auto p-6">
 <header className="text-center mb-8">
 <h1 className="text-4xl font-bold text-blue-600 mb-3">OCR 文字识别工具</h1>
 <p className="text-gray-600 text-lg">上传图片或截图，快速提取文字</p>
 </header>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white rounded-xl shadow-lg p-6">
 <h2 className="text-xl font-semibold mb-4 text-gray-800">图片输入</h2>
 
 <LanguageSelector language={language} onLanguageChange={setLanguage}/>

 <ImageUploader image={image} isDragging={isDragging} onFileUpload={handleFileUpload} onElectronFileDialog={handleElectronFileDialog} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onRemoveImage={removeImage}/>

 <button onClick={recognizeText} disabled={!image || isProcessing} className={`w-full mt-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md ${!image || isProcessing
 ? 'bg-gray-400 text-white cursor-not-allowed'
 : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transform hover:scale-105'}`}>
 {isProcessing ? `识别中... ${progress}%` : '一键识别'}
 </button>

 <ProgressBar progress={progress} isProcessing={isProcessing}/>
 </div>

 <ResultDisplay result={result} onResultChange={setResult} onCopy={copyResult} onSave={saveToFile} onClear={clearAll}/>
 </div>

 <footer className="mt-8 text-center text-gray-500 text-sm">
 <p>支持多语言识别 | 快速提取文字 | 一键复制导出</p>
 </footer>
 </div>
 </div>);
}
export default App;

