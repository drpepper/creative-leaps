const gulp = require('gulp');
const htmlreplace = require('gulp-html-replace');
const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const del = require('del');
const uglify = require('gulp-uglify');
const pump = require('pump');


function clean() {
  return del(['build', 'dist']);
}
exports.clean = clean;

async function bundle() {
  const bundle = await rollup.rollup({
    input: 'src/game.js',
    plugins: [
      nodeResolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      })
    ]
  });

  await bundle.write({
    file: 'build/bundle.js',
    format: 'umd',
    name: 'bundle'
  });
};
exports.bundle = bundle;

function writeHtml() {
  return gulp.src('index.html')
    .pipe(htmlreplace({
      'js': 'bundle.js'
    })).pipe(gulp.dest('build/'));
};
exports.writeHtml = writeHtml;

function copyBuildAssets() {
  return gulp.src([
    './deps/*',
    './images/*',
    './game.css',
    './fonts/css/*',
    './fonts/font/*',
  ], { base: '.'})
  .pipe(gulp.dest('build/'));
};
exports.copyBuildAssets = copyBuildAssets;

function compress(cb) {
  pump([
    gulp.src('build/**/*.js'),
    uglify(),
    gulp.dest('dist')
    ], cb
  );
};
exports.compress = compress;

function copyDistAssets() {
  return gulp.src([
    './build/images/*',
    './build/game.css',
    './build/index.html',
    './build/fonts/**',
  ], { base: './build'})
  .pipe(gulp.dest('dist/'));
};
exports.copyDistAssets = copyDistAssets;

function watchFiles() {
  gulp.watch('src/*', bundle);
  gulp.watch('index.html', writeHtml);
  return gulp.watch(['images/*', 'deps/*', '*.css'], copyBuildAssets);
};
exports.watchFiles = watchFiles;


// Meta-tasks

const build = gulp.series(clean, gulp.parallel([bundle, writeHtml, copyBuildAssets]));
exports.build = build;

const dist = gulp.series(build, gulp.parallel([compress, copyDistAssets]));
exports.dist = dist;

const watch = gulp.series(build, watchFiles);
exports.watch = watch;

exports.default = build;
