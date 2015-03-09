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
            postInstConfig = {},
            numDownloads = {};


        var checkModule = function (module, moduleName) {
            grunt.log.writeln(' ');
            grunt.log.writeln('Check: ' + moduleName);
            var modulePath = stripTrailingSlash(module.path);

            if (moduleExists(modulePath)) {
                if (moduleInstalled(modulePath)) {
                    compileModule(module, moduleName);
                } else {
                    grunt.log.writeln('Not compilable, download distribution.');
                    downloadModule(modulePath, moduleName);
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

            var components = {};
            components[moduleName] = module.bower_postinst;

            postInstConfig[moduleName] = {
                options: {
                    components: components
                }
            };

            grunt.log.writeln('Compiling..');

            grunt.config.set('bower_postinst', postInstConfig);
            grunt.task.run('bower_postinst:' + moduleName);

            done();
        };

        var downloadModule = function (modulePath, moduleName) {
            var filePath = modulePath + '/' + 'bower.json';

            if (grunt.file.exists(filePath)) {
                var json = grunt.file.readJSON(filePath),
                    files;

                if (_.has(json, 'main')) {
                    files = json.main;
                    if (!_.isArray(files)) {
                        files = [files];
                    }

                    numDownloads[moduleName] = files.length;

                    files.forEach(function (file) {
                        downloadFile(file, moduleName);
                    });
                } else {
                    grunt.log.writeln('No compiled source path specified in package.json, skipping');
                    downloadComplete(moduleName);
                }
            }
        };

        var downloadFile = function (filePath, moduleName) {

            var path = stripTrailingSlash(options.sourceServer) + '/' + filePath;

            grunt.log.writeln('Downloading (' + path + ')');
            http.get(path, function(response) {
                if (response.statusCode === 200) {
                    var targetDir = stripTrailingSlash(options.targetDir);
                    grunt.file.mkdir(targetDir);
                    grunt.file.mkdir(getFilePath(targetDir + '/' + filePath));

                    var file = fs.createWriteStream(targetDir + '/' + filePath, {
                        flags: 'w',
                        mode: '0666'
                    });
                    response.pipe(file);

                    file.on('finish', function () {
                        file.close(downloadComplete.bind(this, moduleName));  // close() is async, call cb after close completes.
                    });
                } else {
                    grunt.log.writeln('error (' + path + ')');
                    downloadComplete(moduleName);
                }
            });
        };

        var downloadComplete = function (moduleName) {
            numDownloads[moduleName] -= 1;
            if (numDownloads[moduleName] <= 0) {
                done();
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

        var getFilePath = function (path) {
            return path.replace(getFileName(path), '');
        };


        _.each(options.modules, checkModule);
    });

};
