import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  // load env files from the repository root
  envDir: resolve(__dirname, '..'),
  plugins: [react()],
})
