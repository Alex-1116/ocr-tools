import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Language } from '../types';

interface UseOCROptions {
  language: Language;
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useOCR(options: UseOCROptions) {
  const { language, onSuccess, onError } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const recognizeText = useCallback(async (image: string) => {
    if (!image) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(image, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      onSuccess?.(text);
      return text;
    } catch (error) {
      console.error('OCR Error:', error);
      onError?.(error as Error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [language, onSuccess, onError]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
  }, []);

  return {
    isProcessing,
    progress,
    recognizeText,
    reset,
  };
}
