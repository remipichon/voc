'use strict';

var fs = require('fs');
var path = require('path');
var resourceUtil = require("./resourceUtil");
var utils = require("./utils");
var _ = require("underscore");
var fsUtil = require("./fsUtil");

module.exports = {
    /**
     * thanks to https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
     */
    _walkResourceFile: function (dir, done) {
        var self = this;
        var results = [];
        fs.readdir(dir, function (err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function (file) {
                file = path.resolve(dir, file);
                fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        self._walkResourceFile(file, function (err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        if (resourceUtil.isResourceFile(file)) {
                            results.push(file);
                        }
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    },

    /**
     * @summary Recursively scan directory to find all VOC resource files
     * @param dir <String>   relative or absolute path
     * @returns {Promise}
     */
    walkResourceFilePromise: function (dir) {
        var self = this;
        return new Promise((resolve, reject) => {
            self._walkResourceFile(dir, (err, allPaths) => {
                if (err)
                    reject(err);
                else
                    resolve(allPaths);
            });
        });
    },

};