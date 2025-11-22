'use client'

import { useState } from 'react'

interface ArtPiece {
  url: string
  title: string
  description: string
}

export default function Home() {
  const [businessType, setBusinessType] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [artStyle, setArtStyle] = useState('minimal')
  const [loading, setLoading] = useState(false)
  const [artCollection, setArtCollection] = useState<ArtPiece[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setArtCollection([])
    setProgress('جاري تحليل وصف المحل...')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessType,
          additionalDetails,
          artStyle,
        }),
      })

      if (!response.ok) {
        throw new Error('فشل في توليد الصور')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'progress') {
                  setProgress(parsed.message)
                } else if (parsed.type === 'art') {
                  setArtCollection(prev => [...prev, parsed.data])
                } else if (parsed.type === 'error') {
                  setError(parsed.message)
                }
              } catch (e) {
                console.error('Parse error:', e)
              }
            }
          }
        }
      }
    } catch (err) {
      setError('حدث خطأ أثناء توليد الصور. يرجى المحاولة مرة أخرى.')
      console.error(err)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleDownload = async (url: string, title: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${title}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🎨 مولد الصور الحائطية</h1>
        <p>أنشئ حزمة صور حائطية احترافية لمحلك التجاري بضغطة زر</p>
      </div>

      <div className="form-container">
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label htmlFor="businessType">نوع المحل أو المشروع</label>
            <input
              type="text"
              id="businessType"
              placeholder="مثال: مقهى، محل عطور، صالون نسائي، مطعم برغر..."
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="additionalDetails">تفاصيل إضافية (اختياري)</label>
            <textarea
              id="additionalDetails"
              placeholder="أضف أي تفاصيل إضافية عن جو المكان، الألوان المفضلة، أو الطابع المطلوب..."
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="artStyle">أسلوب التصميم</label>
            <select
              id="artStyle"
              value={artStyle}
              onChange={(e) => setArtStyle(e.target.value)}
            >
              <option value="minimal">Minimal - بسيط وأنيق</option>
              <option value="modern">Modern - عصري وجريء</option>
              <option value="flat">Flat - مسطح وملون</option>
              <option value="geometric">Geometric - هندسي وتجريدي</option>
              <option value="botanical">Botanical - نباتي وطبيعي</option>
              <option value="abstract">Abstract - تجريدي وفني</option>
            </select>
          </div>

          <button type="submit" className="generate-btn" disabled={loading}>
            {loading ? '⏳ جاري التوليد...' : '✨ توليد الصور الحائطية'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>{progress || 'جاري العمل...'}</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {artCollection.length > 0 && (
        <div className="gallery">
          <h2>🖼️ مجموعتك الحائطية ({artCollection.length} قطعة)</h2>
          <div className="gallery-grid">
            {artCollection.map((art, index) => (
              <div key={index} className="art-card">
                <img src={art.url} alt={art.title} />
                <div className="art-info">
                  <h3>{art.title}</h3>
                  <p>{art.description}</p>
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(art.url, art.title)}
                  >
                    ⬇️ تحميل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
