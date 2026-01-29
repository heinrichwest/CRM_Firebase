import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode`
  const env = loadEnv(mode, process.cwd(), '')
  const useFirebase = env.VITE_USE_FIREBASE === 'true'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    },
    build: {
      rollupOptions: {
        // When not using Firebase, mark Firebase modules as external
        // This prevents them from being bundled
        external: useFirebase ? [] : [
          'firebase/app',
          'firebase/auth',
          'firebase/firestore',
          /^firebase\/.*/
        ]
      }
    },
    // Prevent warnings about external modules during build
    optimizeDeps: {
      exclude: useFirebase ? [] : ['firebase']
    }
  }
})
