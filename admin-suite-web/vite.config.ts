import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    // Raise the warning threshold to 600 KB
    chunkSizeWarningLimit: 600,
    // Target modern browsers for smaller, cleaner output
    target: 'es2020',
    // Use Vite 8's native oxc minifier (fastest, no extra install needed)
    minify: 'oxc',
    // Enable CSS code splitting — each chunk gets only the CSS it needs
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Split into logical chunks for better browser caching & parallel loading
        manualChunks(id) {
          // Vendor chunk: all node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [],
  },
});
