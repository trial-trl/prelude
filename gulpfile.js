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
const { camelCase } = require( 'camel-case' );

const prod = process.env.NODE_ENV === 'production';

const paths = {
    src: 'src/',
    dist: 'dist/',
    tmp: 'tmp/'
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
    var g1 = src( [ paths.src + '**/*.pug', '!' + paths.src + 'templates/*.pug', '!' + paths.src + 'index.pug' ] )
                .pipe( plumber() )
                .pipe( cache( pug( { client: true, data: prod ? pugDataProd : pugDataDev, compileDebug: false } ) ) )
                .pipe( rename( { extname: '.pug.js' } ) )
                .pipe( tap( function ( file ) {
                    file.contents = Buffer.concat( [
                        new Buffer( 'window.Pug = window.Pug || {}; window.Pug.blocks = window.Pug.blocks || {}; Pug.blocks["' + path.basename(file.path, '.pug.js') + '"] = (function(){' ),
                        file.contents
                    ] );
                    file.contents = Buffer.concat( [
                        file.contents,
                        new Buffer( 'return template;})()' )
                    ] );
                } ) )
                .pipe( _if( prod, uglify() ) )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    var g2 = src( paths.src + 'templates/*.pug' )
                .pipe( plumber() )
                .pipe( cache( pug( { client: true, data: prod ? pugDataProd : pugDataDev, compileDebug: false } ) ) )
                .pipe( tap( function ( file ) {
                    file.contents = Buffer.concat( [
                        new Buffer( 'window.Pug = window.Pug || {}; window.Pug.templates = window.Pug.templates || {}; Pug.templates["' + path.basename(file.path, '.js') + '"] = (function(){' ),
                        file.contents
                    ] );
                    file.contents = Buffer.concat( [
                        file.contents,
                        new Buffer( 'return template;})()' )
                    ] );
                } ) )
                .pipe( concat( 'templates.min.js' ) )
                .pipe( _if( prod, uglify() ) )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    var g3 = src( paths.src + 'index.pug' )
                .pipe( plumber() )
                .pipe( cache( pug( { client: false, data: prod ? pugDataProd : pugDataDev, compileDebug: false } ) ) )
                .pipe( dest( prod ? paths.dist : paths.tmp ) );
    return merge( g1, g2, g3 );
}

function sass2css( cb ) {
    return src( paths.src + '**/*.scss' )
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
    return src( paths.src + 'css/_themes.scss' )
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
    return src( [ (prod ? paths.dist : paths.tmp) + 'js/themes.js' ] )
            .pipe( concat( 'main.js' ) )
            .pipe( _if( prod, uglify() ) )
            .pipe( dest( (prod ? paths.dist : paths.tmp) + 'js' ) );
}

function js( cb ) {
    return src( paths.src + '**/*.js' )
            .pipe( plumber() )
            .pipe( _if( prod, uglify() ) )
            .pipe( dest( prod ? paths.dist : paths.tmp ) );
}

function json( cb ) {
    return src( paths.src + '**/*.json' )
            .pipe( plumber() )
            .pipe( _if( prod, uglify() ) )
            .pipe( dest( prod ? paths.dist : paths.tmp ) );
}

function keep( cb ) {
    var g1 = src( paths.src + '/svg/**/*' )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/svg' ) );
    var g2 = src( paths.src + '/css/*.css' )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/css' ) );
    var g3 = src( paths.src + '/webfonts/**/*' )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/webfonts' ) );
    var g4 = src( 'bower_components/**/*' )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/bower_components' ) );
    var g6 = src( paths.src + '/img/**/*' )
                .pipe( dest( (prod ? paths.dist : paths.tmp) + '/img' ) );
    return merge( g1, g2, g3, g4, g6 );
}

function startServer( cb ) {
    browserSync.init( {
        injectChanges: true,
        server: {
            baseDir: paths.tmp,
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
    watch( paths.src + '**/*.pug', series( pugCompile, reload ) );
    watch( paths.src + '**/*.scss', series( sass2css ) );
    watch( paths.src + 'css/_themes.scss', series( sass2css, generateTheme, mergeConvertedCssWithMain, reload ) );
    watch( paths.src + '**/*.js', series( js, mergeConvertedCssWithMain, reload ) );
    watch( [paths.src + '**/*.jpg', paths.src + '**/*.png', paths.src + '**/*.svg', paths.src + '**/*.ico', paths.src + '**/*.gif'], series( keep, reload ) );
    done();
}

const build = series( pugCompile, sass2css, generateTheme, js, mergeConvertedCssWithMain, json, keep );

exports.cacheClear = cacheClear;
exports.build = series( clean, build, reload );
exports.serve = series( clean, build, startServer );