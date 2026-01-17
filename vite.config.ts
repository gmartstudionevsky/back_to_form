import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : process.env.VITE_BASE_PATH ?? '/back_to_form/',
  plugins: [react()],
}));
