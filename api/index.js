import { VercelRequest, VercelResponse } from '@vercel/node'
import type { RequestListener } from 'http'

// Importar o handler SSR gerado pelo TanStack Start
const serverHandler = (await import('../dist/server/index.js')).default

// Converter o handler HTTP para formato Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Executar o servidor TanStack Start
    if (typeof serverHandler === 'function') {
      await serverHandler(req, res)
    } else {
      // Se for um middleware, chamar como middleware
      return serverHandler(req, res)
    }
  } catch (error) {
    console.error('Handler Error:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    })
  }
}


