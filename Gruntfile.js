/*
 * ahws-grunt-compile-module
 * https://github.com/ahwswebdev/ahws-grunt-compile-module
 *
 * Copyright (c) 2014 Rick Ekelschot
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js',
                '<%= nodeunit.tests %>'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ['tmp']
        },

        // Configuration to be run (and then tested).
        compile_module: {
            default: {
                options: {
                    file: '.bowerrc',
                    targetDir: 'target/war/_js/ah-online',
                    modules: {
                        'ecommerce-ah-online-navigation': {
                            path: "bower_components/ecommerce-ah-online-navigation",
                            bower_postinst: [
                                { 'grunt': 'compile' }
                            ]
                        }
                    }
                }
            }
        },

        // Unit tests.
        nodeunit: {
            tests: ['test/*_test.js']
        }

    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('test', ['clean', 'compile_module', 'nodeunit']);

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'test']);

};
