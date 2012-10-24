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

    function cmd(command) {
        return function() {
            var exec = require('child_process').exec;
            var util = require('util');

            var done = this.async();
            var p = exec(command , {}, function(err) {
                done();
            });

            util.pump(p.stdout, process.stdout);
            util.pump(p.stderr, process.stderr);
        };
    }

    grunt.registerTask('dev', cmd('node app -d'));
    grunt.registerTask('replay', cmd('flow-send <flows 0/127.0.0.1/9996 -x 100'));
    grunt.registerTask('record', cmd('flow-receive >flows 0/0/9996'));
    grunt.registerTask('cleandb', cmd("redis-cli flushall"));
    grunt.registerTask('countdb', cmd("redis-cli keys 'st_*' | wc -l"));
    grunt.registerTask('stats', cmd("scripts/stat.py"));
    grunt.registerTask('capture', cmd('sudo uacctd -f conf/uacctd.conf -L 131072'));
};
