const esbuild = require('esbuild');
const fs = require('fs').promises;

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
      minify: false,
      external: [
        'electron',
        'os',
        '@xterm/*',
        'dayjs',
        'marked',
        'node-pty'
      ]
    });

    // Copy static assets
    await fs.mkdir('dist', { recursive: true });
    await fs.copyFile('src/renderer/index.html', 'dist/index.html');
    await fs.copyFile('src/renderer/styles.css', 'dist/styles.css');

    // Copy fonts directory
    await fs.mkdir('dist/fonts', { recursive: true });
    const fonts = await fs.readdir('fonts');
    for (const font of fonts) {
      await fs.copyFile(`fonts/${font}`, `dist/fonts/${font}`);
    }

    // Copy xterm CSS
    await fs.mkdir('dist/node_modules/@xterm/xterm/css', { recursive: true });
    await fs.copyFile(
      'node_modules/@xterm/xterm/css/xterm.css',
      'dist/node_modules/@xterm/xterm/css/xterm.css'
    );

    console.log('Build complete');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
