import { NextRequest } from 'next/server'

const BUSINESS_PROFILES: Record<string, any> = {
  'مقهى': {
    theme: 'cozy and warm',
    colors: ['#8B4513', '#D2691E', '#F4A460', '#FFF8DC'],
    artTypes: ['coffee illustrations', 'minimal coffee beans', 'abstract coffee art', 'cozy cafe scenes'],
  },
  'مقهى نباتي': {
    theme: 'natural and organic',
    colors: ['#228B22', '#90EE90', '#F0FFF0', '#8FBC8F'],
    artTypes: ['botanical illustrations', 'leaf patterns', 'plant line art', 'organic shapes'],
  },
  'محل عطور': {
    theme: 'elegant and luxurious',
    colors: ['#800080', '#FFD700', '#F0E68C', '#E6E6FA'],
    artTypes: ['elegant perfume bottles', 'minimal luxury art', 'abstract elegance', 'golden accents'],
  },
  'مطعم برغر': {
    theme: 'bold and appetizing',
    colors: ['#FF4500', '#FFD700', '#8B4513', '#FFDAB9'],
    artTypes: ['food illustrations', 'minimal burger art', 'bold geometric shapes', 'appetizing patterns'],
  },
  'صالون نسائي': {
    theme: 'elegant and feminine',
    colors: ['#FFB6C1', '#DDA0DD', '#FFF0F5', '#E0BBE4'],
    artTypes: ['elegant line art', 'feminine silhouettes', 'floral patterns', 'luxury beauty art'],
  },
  'محل كتب': {
    theme: 'intellectual and cozy',
    colors: ['#8B4513', '#F5DEB3', '#D2B48C', '#FFFAF0'],
    artTypes: ['book illustrations', 'literary quotes art', 'minimal reading scenes', 'abstract knowledge'],
  },
  'مكتب': {
    theme: 'professional and modern',
    colors: ['#4682B4', '#708090', '#F5F5F5', '#B0C4DE'],
    artTypes: ['geometric modern art', 'minimal professional art', 'abstract corporate', 'clean lines'],
  },
}

function analyzeBusinessType(input: string): any {
  const lowerInput = input.toLowerCase()

  for (const [key, value] of Object.entries(BUSINESS_PROFILES)) {
    if (lowerInput.includes(key.toLowerCase())) {
      return value
    }
  }

  if (lowerInput.includes('café') || lowerInput.includes('coffee') || lowerInput.includes('قهوة')) {
    return BUSINESS_PROFILES['مقهى']
  }
  if (lowerInput.includes('restaurant') || lowerInput.includes('مطعم') || lowerInput.includes('food')) {
    return BUSINESS_PROFILES['مطعم برغر']
  }
  if (lowerInput.includes('salon') || lowerInput.includes('beauty') || lowerInput.includes('تجميل')) {
    return BUSINESS_PROFILES['صالون نسائي']
  }
  if (lowerInput.includes('perfume') || lowerInput.includes('عطر')) {
    return BUSINESS_PROFILES['محل عطور']
  }
  if (lowerInput.includes('book') || lowerInput.includes('كتاب') || lowerInput.includes('library')) {
    return BUSINESS_PROFILES['محل كتب']
  }
  if (lowerInput.includes('office') || lowerInput.includes('مكتب')) {
    return BUSINESS_PROFILES['مكتب']
  }

  return {
    theme: 'modern and clean',
    colors: ['#667eea', '#764ba2', '#f0f0f0', '#ffffff'],
    artTypes: ['minimal modern art', 'abstract shapes', 'clean geometric', 'contemporary design'],
  }
}

function generateStyleGuide(artStyle: string): string {
  const styles: Record<string, string> = {
    minimal: 'minimalist, clean lines, simple shapes, lots of white space, elegant and understated',
    modern: 'contemporary, bold, vibrant colors, geometric, trendy and eye-catching',
    flat: 'flat design, solid colors, simple illustrations, playful and friendly',
    geometric: 'geometric shapes, abstract patterns, mathematical precision, structured and modern',
    botanical: 'botanical illustrations, plants and leaves, natural and organic, delicate line work',
    abstract: 'abstract art, artistic expression, creative shapes, thought-provoking and unique',
  }

  return styles[artStyle] || styles.minimal
}

async function generateArtWithDALLE(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    }),
  })

  if (!response.ok) {
    throw new Error(`DALL-E API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].url
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { businessType, additionalDetails, artStyle } = await req.json()

        const sendMessage = (type: string, data: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
          )
        }

        sendMessage('progress', { message: 'جاري تحليل وصف المحل...' })

        const profile = analyzeBusinessType(businessType)
        const styleGuide = generateStyleGuide(artStyle)

        sendMessage('progress', { message: 'جاري تصميم هوية الصور الحائطية...' })

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not configured')
        }

        const artPromises = []
        const numberOfPieces = 8

        for (let i = 0; i < numberOfPieces; i++) {
          const artType = profile.artTypes[i % profile.artTypes.length]
          const colorScheme = profile.colors.join(', ')

          const prompt = `Create a high-quality wall art poster in ${styleGuide} style. Theme: ${profile.theme}. Subject: ${artType}. Color palette: ${colorScheme}. The design should be suitable for framing and hanging in a ${businessType} business. Professional, commercial-grade artwork with a cohesive aesthetic. ${additionalDetails ? `Additional context: ${additionalDetails}` : ''} Aspect ratio suitable for wall display. No text or words in the image.`

          artPromises.push(
            (async () => {
              sendMessage('progress', { message: `جاري توليد القطعة ${i + 1} من ${numberOfPieces}...` })

              try {
                const url = await generateArtWithDALLE(prompt, apiKey)

                const artPiece = {
                  url,
                  title: `قطعة ${i + 1} - ${artType}`,
                  description: `${profile.theme} | ${artStyle}`,
                }

                sendMessage('art', { data: artPiece })
              } catch (error) {
                console.error(`Failed to generate art piece ${i + 1}:`, error)
                sendMessage('progress', { message: `تخطي القطعة ${i + 1} بسبب خطأ...` })
              }
            })()
          )
        }

        await Promise.all(artPromises)

        sendMessage('progress', { message: 'اكتملت جميع الصور! ✨' })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error: any) {
        console.error('Generation error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error.message || 'حدث خطأ أثناء التوليد'
          })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
