import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ScreenshotPage from './components/ScreenshotPage'
import './index.css'

// 根据 URL hash 判断显示哪个页面
const hash = window.location.hash

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {hash === '#screenshot' ? <ScreenshotPage /> : <App />}
  </React.StrictMode>,
)
