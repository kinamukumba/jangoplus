import type { VercelRequest, VercelResponse } from '@vercel/node'

// Importar o servidor SSR compilado do TanStack Start
let serverHandler: any

async function loadServerHandler() {
  if (!serverHandler) {
    try {
      const mod = await import('../dist/server/index.js')
      serverHandler = mod.default
    } catch (error) {
      console.error('Failed to load server handler:', error)
      throw error
    }
  }
  return serverHandler
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const handler = await loadServerHandler()

    // Executar o handler do TanStack Start
    if (typeof handler === 'function') {
      return handler(req, res)
    } else {
      console.error('Server handler is not a function')
      res.status(500).json({ error: 'Internal Server Error' })
    }
  } catch (error) {
    console.error('Server Error:', error)
    res.status(500).json({
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    })
  }
}
