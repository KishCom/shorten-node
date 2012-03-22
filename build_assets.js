var ams = require('ams');
var sys = require('util')
var exec = require('child_process').exec;

var ROOT_DIR = __dirname + '/public/media',
    CSS_DIR = ROOT_DIR + '/css',
    JS_DIR = ROOT_DIR + '/js',
    HOST_NAME = 'http://localhost:8888';

// public/media/css/style.less is the main styles file
// Here we parse style.less into style.css - the dev server does this with middleware
var runless = 'lessc ' + CSS_DIR + '/style.less > ' + CSS_DIR + '/style.css';
exec(runless, function(error, stdout, stderr){
	if (error !== null || stderr !== ""){

        console.log("LESS Compile Error:");
        console.log(stderr);
        process.exit(1);
    }else{
        console.log("LESS compiled, concatenating and minifing...");
        runBuild();
    }
});

function runBuild(){
    ams.build.create(ROOT_DIR)
    .add(
     [CSS_DIR + '/style.css',
     JS_DIR + '/ender.min.js',
     JS_DIR + '/zeroclipboard/ZeroClipboard.js',
     JS_DIR + '/shorten.js'])
    .process({
    	cssvendor: false, // Less takes care of vendor specific prefixes
        cssabspath: {
            host: HOST_NAME,
            verbose: true
        },
        htmlabspath: {
            host: HOST_NAME,
            verbose: true
        },
        texttransport: false,
        jstransport: false, // Don't wrap our JS in anything
        uglifyjs: {
            verbose: true
        }
    })
    .combine({ // Combine all js and css files
        js: 'shorten.min.js',
        css: 'shorten.min.css'
    })
    .write(ROOT_DIR) // Write them to disk
    .end();
}