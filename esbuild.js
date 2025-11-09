const esbuild = require('esbuild');
const fs = require('fs').promises;
const path = require('path');

async function build() {
  try {
    // Bundle renderer
    await esbuild.build({
      entryPoints: ['src/renderer/index.js'],
      outfile: 'dist/renderer.js',
      bundle: true,
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      minify: false
    });

    // Copy static assets
    await fs.mkdir('dist', { recursive: true });
    await fs.copyFile('src/renderer/index.html', 'dist/index.html');
    await fs.copyFile('src/renderer/styles.css', 'dist/styles.css');

    console.log('Build complete');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
