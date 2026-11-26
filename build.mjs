// Build script: bundles the game into ./dist (upload the contents of dist/ to CrazyGames as a zip).
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');
const serve = args.has('--serve');
const out = 'dist';

function copyStatic() {
  fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
  for (const f of fs.readdirSync('public')) fs.copyFileSync(path.join('public', f), path.join(out, f));
  const fonts = [
    ['node_modules/@fontsource/inter/files/inter-latin-300-normal.woff2', 'inter-300.woff2'],
    ['node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2', 'inter-400.woff2'],
    ['node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2', 'inter-600.woff2'],
    ['node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2', 'cormorant-400.woff2'],
    ['node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2', 'cormorant-400i.woff2'],
    ['node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2', 'cormorant-600.woff2'],
  ];
  for (const [src, dst] of fonts) fs.copyFileSync(src, path.join(out, 'fonts', dst));
}

fs.mkdirSync(out, { recursive: true });
copyStatic();

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: path.join(out, 'game.js'),
  format: 'iife',
  target: ['es2020'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  if (serve) {
    const { port } = await ctx.serve({ servedir: out, port: 8080 });
    console.log(`Serving on http://localhost:${port}`);
  }
} else {
  await esbuild.build(options);
  const size = fs.statSync(path.join(out, 'game.js')).size;
  console.log(`game.js: ${(size / 1024 / 1024).toFixed(2)} MB`);
}
