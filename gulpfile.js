'use strict';

const { src, dest, watch, series, parallel } = require( 'gulp' );

const del = require( 'del' );
const path = require( 'path' );
const _if = require( 'gulp-if' );
const rename = require( 'gulp-rename' );
const uglify = require( 'gulp-uglify' );
const sass = require( 'gulp-sass' );
const pug = require( 'gulp-pug' );
const browserSync = require( 'browser-sync' ).create();
const merge = require( 'merge-stream' );
const tap = require( 'gulp-tap' );
const replace = require( 'gulp-replace' );
const history = require( 'connect-history-api-fallback' );
const plumber = require( 'gulp-plumber' );
const concat = require( 'gulp-concat' );
const cache = require( 'gulp-cache' );
const prefixer = require( 'gulp-autoprefixer' );
const csso = require( 'gulp-csso' );
const exec = require( 'gulp-exec' );
const { camelCase } = require( 'camel-case' );

const prod = process.env.NODE_ENV === 'production';

const paths = {
    src: process.env.REAL_CWD + '/src/',
    dist: process.env.REAL_CWD + '/dist/',
    tmp: process.env.REAL_CWD + '/tmp/'
};
const pugDataProd = { 
    url: { 
        absolute: 'https://trialent.com',
        relative: '',
        bower: 'https://trialent.com/bower_components',
        noredo: 'https://trialent.com/bower_components/trl-no-redo',
        webservice: 'https://trialent.com/api'
    } 
};
const pugDataDev = { 
    url: { 
        absolute: 'http://localhost:3000',
        relative: '',
        bower: 'http://localhost:3000/bower_components',
        noredo: 'http://localhost/TRIALRedesign/bower_components/trl-no-redo',
        webservice: 'http://localhost/TRIALRedesignWS'
    } 
};

function clean( cb ) {
    return del( ( prod ? paths.dist : paths.tmp ) + '**');
}

function cacheClear( cb ) {
    return cache.clearAll();
}

function pugCompile( cb ) {
    var g0 = src( [ paths.src + '**/*.pug', '!' + paths.src + 'templates/*.pug', paths.src + 'index.pug' ], {allowEmpty: true} )
                .pipe( exec(file => {
                    return `php tasks/compile/pug.php ${file.path.replace(file.cwd + '\\', '').replace(file.basename, '')} ${paths.tmp + file.path.replace(file.base, '').replace(file.basename, '')}`;
                }, {
                    continueOnError: false, // default = false, true means don't emit error event
                    pipeStdout: false, // default = false, true means stdout is written to file.contents
                } ) )
                .pipe( exec.reporter( {
                    err: true, // default = true, false means don't write err
                    stderr: true, // default = true, false means don't write stderr
                    stdout: true // default = true, false means don't write stdout
                } ) );
    var g1 = src( [ paths.src + '**/template.pug', paths.src + '**/index.pug', '!' + paths.src + 'templates/*.pug', '!' + paths.src + 'index.pug' ], {allowEmpty: true} )
                .pipe( plumber() )
                .pipe( cache( pug( { client: true, data: prod ? pugDataProd : pugDataDev, compileDebug: false } ) ) )
                .pipe( rename( { extname: '.js' } ) )
                .pipe( tap( function ( file ) {
                    var path = file.path.split('\\');
                    path.pop();
                    var unit = path.pop();
                    file.contents = Buffer.concat( [
                        Buffer.from( 'window.Pug = window.Pug || {}; window.Pug.units = window.Pug.units || {}; Pug.units["' + unit + '"] = (function(){' ),
                        file.contents,
                        Buffer.from( 'return template;})()' )
                    ] );
                } ) )
                .pipe( _if( prod, uglify() ) )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    var g2 = src( paths.src + 'templates/*.pug', {allowEmpty: true} )
                .pipe( plumber() )
                .pipe( cache( pug( { client: true, data: prod ? pugDataProd : pugDataDev, compileDebug: false } ) ) )
                .pipe( tap( function ( file ) {
                    file.contents = Buffer.concat( [
                        Buffer.from( 'window.Pug = window.Pug || {}; window.Pug.templates = window.Pug.templates || {}; Pug.templates["' + path.basename(file.path, '.js') + '"] = (function(){' ),
                        file.contents,
                        Buffer.from( 'return template;})()' )
                    ] );
                } ) )
                .pipe( concat( 'templates.min.js' ) )
                .pipe( _if( prod, uglify() ) )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    var g3 = src( paths.src + '**/*.php' )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    /**
     * 
    var g3 = src( paths.src + 'index.pug', {allowEmpty: true} )
                .pipe( plumber() )
                .pipe( cache( pug( { pretty: true, client: false, data: prod ? pugDataProd : pugDataDev, compileDebug: false } ) ) )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    */
    return merge( g0, g1, g2, g3 );
}

function sass2css( cb ) {
    return src( paths.src + '**/*.scss', {allowEmpty: true} )
            .pipe( plumber() )
            .pipe( cache( sass() ) )
            .pipe( prefixer( {
                cascade: false
            } ) )
            .pipe( _if( prod, csso() ) )
            .pipe( dest( prod ? paths.dist : paths.tmp ) )
            .pipe( browserSync.stream() );
}

function generateTheme( cb ) {
    return src( paths.src + 'css/_themes.scss', {allowEmpty: true} )
            .pipe( replace( '$themes: ', 'var themes = ' ) )
            .pipe( replace( /\(/g, '{' ) )
            .pipe( replace( /\)/g, '}' ) )
            .pipe( replace( /([A-Za-z0-9-_]{1,}):/g, function (match, p1, offset, string) {
                return camelCase(p1) + ':';
            } ) )
            .pipe( replace( /: ([A-Za-z0-9-\(\)\#\$.]{1,})/g, function (match, p1, offset, string) {
                return ': "' + p1 + '"';
            } ) )
            .pipe( rename('themes.js') )
            .pipe( dest( (prod ? paths.dist : paths.tmp) + 'js' ) );
}

function mergeConvertedCssWithMain( cb ) {
    return src( [ (prod ? paths.dist : paths.tmp) + 'js/themes.js', (prod ? paths.dist : paths.tmp) + 'js/main.js' ], {allowEmpty: true} )
            .pipe( concat( 'main.js' ) )
            .pipe( _if( prod, uglify() ) )
            .pipe( dest( (prod ? paths.dist : paths.tmp) + 'js' ) );
}

function js( cb ) {
    return src( paths.src + '**/*.js', {allowEmpty: true} )
            .pipe( plumber() )
            .pipe( _if( prod, uglify() ) )
            .pipe( dest( prod ? paths.dist : paths.tmp ) );
}

function json( cb ) {
    return src( paths.src + '**/*.json', {allowEmpty: true} )
            .pipe( plumber() )
            .pipe( _if( prod, uglify() ) )
            .pipe( dest( prod ? paths.dist : paths.tmp ) );
}

function keep( cb ) {
    var g1 = src( paths.src + '/svg/**/*', {allowEmpty: true} )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/svg' ) );
    var g2 = src( paths.src + '/css/*.css', {allowEmpty: true} )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/css' ) );
    var g3 = src( paths.src + '/webfonts/**/*', {allowEmpty: true} )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/webfonts' ) );
    var g4 = src( 'bower_components/**/*', {allowEmpty: true} )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/bower_components' ) );
    var g5 = src( paths.src + '/img/**/*', {allowEmpty: true} )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/img' ) );
    return merge( g1, g2, g3, g4, g5 );
}

function startServer( cb ) {
    browserSync.init( {
        injectChanges: true,
        server: {
            baseDir: '/',
            middleware: [
                history()
            ]
        }
    } );
    startWatch( cb );
}

function reload( done ) {
    browserSync.reload();
    done();
}

function startWatch( done ) {
    watch( './gulpfile.js' ).on( 'change', series( build, reload ) );
    watch( [paths.src + '**/*.pug', paths.src + '**/*.php'], series( pugCompile, reload ) );
    watch( paths.src + '**/*.scss', series( sass2css ) );
    watch( paths.src + 'css/_themes.scss', series( sass2css, generateTheme, mergeConvertedCssWithMain, reload ) );
    watch( paths.src + '**/*.js', series( js, mergeConvertedCssWithMain, reload ) );
    watch( [paths.src + '**/*.jpg', paths.src + '**/*.png', paths.src + '**/*.svg', paths.src + '**/*.ico', paths.src + '**/*.gif'], series( keep, reload ) );
    done();
}

const build = series( 
    pugCompile,
    sass2css,
    generateTheme,
    js,
    mergeConvertedCssWithMain,
    json,
    keep
);

exports.cacheClear = cacheClear;
exports.build = series( clean, build, reload );
exports.serve = series( clean, build, startServer );