module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: '<json:package.json>',
        node: {
            files: ['app.js', 'lib/**/*.js', 'routes/**/*.js']
        },

        watch: {
            files: '<config:node.files>',
            tasks: 'lint'
        },

        lint: {
            all: ['grunt.js', 'app.js', 'lib/**/*.js', 'routes/**/*.js', 'app/js/**/*.js']
        },
        jshint: {
            options: {
                browser: true,
                node: true,
                laxcomma: true
            },
            globals: {
                exports: true,
                define: true,
                angular: true
            }
        }
    });

    grunt.registerTask('dev', function() {
        var exec = require('child_process').exec;
        var util = require('util');

        var done = this.async();
        var p = exec('node_modules/.bin/supervisor app' , {}, function(err) {
            done();
        });

        util.pump(p.stdout, process.stdout);
        util.pump(p.stderr, process.stderr);
    });
};
