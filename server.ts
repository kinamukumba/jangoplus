// Server entry point para Vercel
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createServer } from 'http'

const PORT = process.env.PORT || 3000

// Importar o handler do servidor compilado
const handler = (await import('./dist/server/index.js')).default

// Para Vercel, exportar um handler serverless
export default handler

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  const server = createServer((req, res) => {
    handler(req, res).catch((err) => {
      console.error(err)
      res.statusCode = 500
      res.end('Internal Server Error')
    })
  })

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
  })
}
