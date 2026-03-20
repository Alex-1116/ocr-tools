import Tesseract from 'tesseract.js'

type ProgressCallback = (progress: number, status: string) => void

class OcrEngineClass {
  async recognize(
    image: string,
    language: string,
    onProgress: ProgressCallback
  ): Promise<string> {
    const result = await Tesseract.recognize(image, language, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100), '正在识别文字...')
        } else if (m.status === 'loading language traineddata') {
          onProgress(Math.round(m.progress * 100), '正在加载语言包...')
        } else if (m.status === 'initializing api') {
          onProgress(0, '正在初始化...')
        }
      }
    })

    return result.data.text
  }
}

const OcrEngine = new OcrEngineClass()
export default OcrEngine
