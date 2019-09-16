module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-git-describe');
    var localpackage = grunt.file.readJSON('package.json');

    grunt.initConfig({
        localpackage: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: '\n'
            },
            allJavascripts: {
                src: [
                    'node_modules/clipboard/dist/clipboard.js',
                    'public/media/js/jquery-1.11.1.js',
                    'public/media/js/ender.overlay.js',
                    'public/media/js/shorten.js'
                ],
                dest: 'public/media/js/shorten_concat.js'
            }
        },
        uglify: {
            options: {
                banner: "/**\n"+
                        "<%= localpackage.name %> - <%= gitRevisionSHA %><%= gitRevisionDirty %>\n" +
                        "<%= localpackage.description %>\n" +
                        "JavaScript minified on <%= grunt.template.today('dddd, mmmm dS, yyyy, h:MM:ss TT') %>\n" +
                        "**/\n",
                //sourceMap: 'dist/js/scripts.map', // make sure these don't hit live
                //sourceMapName: 'dist/js/scripts.map'
            },
            dist: {
                files: {
                    'public/media/shorten.min.js': ['<%= concat.allJavascripts.dest %>']
                }
            }
        },
        less: {
            development: {
                options: {
                    paths: [""]
                },
                files: {
                    "public/media/css/style.css": [ "public/media/css/style.less" ]
                }
            },
            production: {
                options: {
                    paths: [""],
                    rootpath: "css/",
                    cleancss: true,
                },
                files: {
                    "public/media/shorten.min.css": [ "public/media/css/style.less" ]
                }
            }
        },
        "git-describe": {
            build: {
                options: {
                    prop: "gitInfo"
                }
            }
        }

    });

    grunt.registerTask('getGitRevision', function() {
        grunt.event.once('git-describe', function (rev) {
            grunt.config('gitRevisionSHA', rev.object);
            grunt.config('gitRevisionTag', rev.tag);
            grunt.config('gitRevisionDirty', rev.dirty);
        });
        grunt.task.run('git-describe');
    });
    grunt.registerTask('default', ['getGitRevision', 'concat', 'uglify', 'less']);
    grunt.registerTask('live', ['concat', 'uglify', 'less']);
};
