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
    grunt.task.loadNpmTasks('grunt-contrib-copy');

    grunt.registerMultiTask('compile_module', '', function () {
        var options = this.options(),
            asyncCb = this.async(),
            done = _.after(Object.keys(options.modules).length, asyncCb),
            _this = this,
            postInstConfig = {},
            numDownloads = {};


        var checkModule = function (module, moduleName) {
            grunt.log.writeln(' ');
            grunt.log.subhead(moduleName);

            if (!_.isEmpty(module) && module.path) {
                module.path = stripTrailingSlash(module.path);

                if (moduleExists(module.path)) {
                    if (moduleInstalled(module.path)) {
                        compileModule(module, moduleName);
                    } else {
                        grunt.log.writeln(options.file + ' file not found, module is not compilable.');
                        grunt.log.ok('Download distribution')
                        downloadModule(module.path, moduleName);
                    }
                } else {
                    var error = grunt.util.error('Module does not exist in your bower_components directory. Have you tried to run a bower update?');
                    throw error;
                }
            } else {
                grunt.log.writeln('Module path is undefined, skipping.');
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


            grunt.log.ok('Compile & copy');
            grunt.config.set('bower_postinst', postInstConfig);

            if (setCopyConfig(module, moduleName)) {
                grunt.task.run('bower_postinst:' + moduleName, 'copy:compile_module-' + moduleName);
            } else {
                grunt.task.run('bower_postinst:' + moduleName);
            }

            done();

        };

        var setCopyConfig = function (module, moduleName) {
            var files = getFiles(module.path),
                copyConfig = {},
                copyFiles = [];

            if (files.length > 0) {
                _.each(files, function (file) {
                    var filePath = module.path + '/' + file,
                        pattern = /[\*]{1,2}[.a-z]{0,3}/;

                    if (filePath.match(pattern)) {
                        copyFiles.push({
                            cwd: filePath.replace(pattern, ''),
                            src: filePath.match(pattern)[0],
                            dest: file.replace(pattern, ''),
                            flatten: false,
                            filter: 'isFile',
                            mode: true,
                            expand: true
                        });
                    } else {
                        copyFiles.push({
                            src: filePath,
                            dest: file
                        });
                    }

                });

                copyConfig['compile_module-' + moduleName] = {
                    files: copyFiles
                };

                grunt.config.set('copy', _.extend(grunt.config.get('copy'), copyConfig));
                return true;
            }

            return false;
        };

        var downloadModule = function (modulePath, moduleName) {
            var files = getFiles(modulePath);

            if (files.length > 0) {
                numDownloads[moduleName] = files.length;

                files.forEach(function (file) {
                    downloadFile(file, moduleName);
                });
            } else {
                downloadComplete(moduleName);
            }
        };

        var getFiles = function (modulePath) {
            var filePath = modulePath + '/' + 'bower.json',
                files = [];

            if (grunt.file.exists(filePath)) {
                var json = grunt.file.readJSON(filePath);

                if (_.has(json, 'main')) {
                    files = json.main;
                    if (!_.isArray(files)) {
                        files = [files];
                    }
                } else {
                    grunt.log.writeln('No main specified in bower.json!');
                }
            }

            return files;
        };

        var createDirectory = function (dir) {
            grunt.file.mkdir(dir);
        };

        var downloadFile = function (filePath, moduleName) {

            var path = stripTrailingSlash(options.sourceServer) + '/' + filePath;

            grunt.verbose.writeln('Downloading (' + path + ')');
            http.get(path, function (response) {
                if (response.statusCode === 200) {
                    var targetDir = stripTrailingSlash(options.targetDir);
                    createDirectory(targetDir);
                    createDirectory(getFilePath(targetDir + '/' + filePath));

                    var file = fs.createWriteStream(targetDir + '/' + filePath, {
                        flags: 'w',
                        mode: '0666'
                    });
                    response.pipe(file);

                    file.on('finish', function () {
                        file.close(downloadComplete.bind(this, moduleName));  // close() is async, call cb after close completes.
                    });
                } else {
                    var error = grunt.util.error('File not found (' + path + ')');
                    throw error;
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
