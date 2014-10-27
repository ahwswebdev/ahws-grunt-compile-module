/*globals require*/
/*
 * ahws-grunt-module-installed
 * https://github.com/ahwswebdev/ahws-grunt-release
 *
 * Copyright (c) 2014 ahwswebdev
 * Licensed under the MIT license.
 */

var _ = require('lodash'),
    http = require('http'),
    fs = require('fs');

module.exports = function (grunt) {

    'use strict';

    grunt.task.loadNpmTasks('grunt-bower-postinst');

    grunt.registerMultiTask('compile_module', '', function () {
        var options = this.options(),
            asyncCb = this.async(),
            done = _.after(Object.keys(options.modules).length, asyncCb),
            _this = this,
            postInstConfig = {
                compile: {
                    options: {
                        components: {}
                    }
                }
            };

        var checkModule = function (module, moduleName) {
            grunt.log.writeln(' ');
            grunt.log.writeln('Check: ' + moduleName);
            var modulePath = stripTrailingSlash(module.path);

            if (moduleExists(modulePath)) {
                if (moduleInstalled(modulePath)) {
                    compileModule(module, moduleName);
                } else {
                    grunt.log.writeln('Not compilable, download distribution.');
                    downloadDist(modulePath);
                }
            } else {
                grunt.log.writeln('Module does not exist, skipping..');
                done();
            }
        };

        var moduleInstalled = function (modulePath) {
            return grunt.file.exists(modulePath + '/' + options.file);
        };

        var moduleExists = function (modulePath) {
            return grunt.file.isDir(modulePath);
        };

        var compileModule = function (module, moduleName) {

            postInstConfig.compile.options.components[moduleName] = module.bower_postinst;

            grunt.log.writeln('Compiling..');

            grunt.config.set('bower_postinst', postInstConfig);
            grunt.task.run('bower_postinst');

            done();
        };

        var downloadDist = function (modulePath) {
            var filePath = modulePath + '/' + 'package.json';

            if (grunt.file.exists(filePath)) {
                var json = grunt.file.readJSON(filePath);
                if (_.has(json, 'dist')) {
                    var distPath = json['dist'].toString();

                    var download = http.get(distPath, function(response) {
                        if (response.statusCode === 200) {
                            var targetDir = stripTrailingSlash(options.targetDir);
                            grunt.file.mkdir(targetDir);

                            var file = fs.createWriteStream(options.targetDir + '/' + getFileName(distPath));
                            response.pipe(file);

                            file.on('finish', function() {
                                file.close(done);  // close() is async, call cb after close completes.
                            });
                        }
                    });
                } else {
                    grunt.log.writeln('No compiled source path specified in package.json, skipping');
                    done();
                }
            }
        };

        var stripTrailingSlash = function (path) {
            if (path.charAt(path.length) === '/') {
                return path.substr(0, path.length);
            }

            return path;
        };

        var getFileName = function (path) {
            return path.substring(path.lastIndexOf('/') + 1, path.length);
        };


        _.each(options.modules, checkModule);
    });

};
