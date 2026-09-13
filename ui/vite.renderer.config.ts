import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  css: {
    // flexlayout-react ships dark.css without its sourcemap — suppress the noise
    devSourcemap: false,
  },
});
