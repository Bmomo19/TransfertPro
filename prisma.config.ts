import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Charger .env.local en priorité, puis .env
config({ path: resolve(__dirname, '.env.local') })
config({ path: resolve(__dirname, '.env') })

export default defineConfig({
  datasource: {
    // Utilise la connexion pooler session-mode (port 5432) compatible avec les migrations
    url: process.env.DATABASE_URL,
  },
})
