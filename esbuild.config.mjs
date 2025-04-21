import process from 'process';
import * as esbuild from 'esbuild';
import builtins from 'builtin-modules';

const banner = ``;
const prod = process.argv[2] === 'production';
const dev = process.argv[2] === 'development';

let buildOptions = {
    banner: {
        js: banner,
    },
    bundle: true,
    entryPoints: ['./src/main.ts'],
    external: ['obsidian', 'electron', ...builtins],
    loader: { '.mp3': 'base64' },
    format: 'cjs',
    logLevel: 'info',
    minify: prod ? true : false,
    outfile: 'main.js',
    plugins: [ ],
    sourcemap: 'inline',
    target: 'es2016',
    treeShaking: true,
};

if (dev) {
    // @ts-ignore
    let ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('watching...');
} else {
    // @ts-ignore
    esbuild.build(buildOptions).catch(() => process.exit(1));
}
