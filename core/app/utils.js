var exec = require('child_process').exec;
// var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');


module.exports = {

    writeResult: function (artifactDir, resultFile, repoFolder, key, value) {
        console.log(artifactDir, resultFile, repoFolder, key, value);

        var resultJson = {};
        if (fs.existsSync(repoFolder+artifactDir+resultFile)) {
            var resultTest = fs.readFileSync(repoFolder+artifactDir+resultFile).toString();
            resultJson = JSON.parse(resultTest);
        }
        if (resultJson[key]) {
            if (!Array.isArray(resultJson[key])) {
                var previous = resultJson[key];
                resultJson[key] = [];
                resultJson[key].push(previous)
            }
            resultJson[key].push(value);
        } else
            resultJson[key] = value;
        if (!fs.existsSync(repoFolder + artifactDir)) {
            fs.mkdirSync(repoFolder + artifactDir);
        }
        console.log("resultJson", resultJson);
        fs.writeFileSync(repoFolder+artifactDir+resultFile, JSON.stringify(resultJson));
    },

    execCmd: function (cmd, callback) {
        console.log("exec cmd", cmd);
        exec(cmd, function (error, stdout, stderr) {
            // command output is in stdout
            if (error) console.error("error", error);
            console.log(cmd, "stdout is");
            console.log(stdout);
            if (stderr) console.error("stderr", stderr);
            if (callback) callback(error, stdout, stderr)
        });
    },

    _isResourceFile: function (pattern, path) {
        return pattern.exec(path) !== null
    },

    resourceTypeRegex: {
        "dockercompose": /docker-compose\.([a-zA-Z0-9_-]+)\.yml$/m,           //docker-compose.<dc-name>.yml
        "stackdefinition": /stack-defintion\.([a-zA-Z0-9_-]+)\.json$/m,       //stack-definition.<sd-name>.json
        "stackinstance": /stack-instance\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json$/m,  //stack-instance.<sd-name>.<si-name>[.<suffix>].json
        "simplestackinstance": /stack-instance\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+).json$/m,  //stack-instance.<dc-name>.<si-name>.json
        "dockerfile": /Dockerfile_([a-zA-Z0-9]+)$/m,
        "imageconfig": /Dockerfile_([a-zA-Z0-9]+)_config\.json$/m
    },

    _getResourceName(pattern, path, matchIndex){
        var match = pattern.exec(path);
        //console.log(pattern, path,match)
        if (match) {
            if(matchIndex)
                return match[matchIndex];
            return match
        } else {
            return null;
        }
    },

    getTypeAndResourceName(path){
        if (this.isComposeFile(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.dockercompose, path, 1),
                type: "dockercompose"
            };
        if (this.isStackDefinition(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.stackdefinition, path, 1),
                type: "stackdefinition"
            };
        if (this.isStackInstance(path)) {
            let matches = this._getResourceName(this.resourceTypeRegex.stackinstance, path);
            return {
                name: matches[2],
                stackDefinitionName: matches[1],
                suffix: (matches[3] == "json")? null: matches[3], //couldn't make a proper regexp for that
                type: "stackinstance"
            };
        }
        if (this.isSimpleStackInstance(path)) {
            let matches = this._getResourceName(this.resourceTypeRegex.simplestackinstance, path);
            return {
                name: matches[2],
                dockerComposeName: matches[1],
                type: "simplestackinstance"
            };
        }
        if (this.isDockerfile(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.dockerfile, path, 1),
                type: "dockerfile"
            };
        if (this.isImageConfig(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.imageconfig, path, 1),
                type: "imageconfig"
            };
        return null;
    },

    removeLastPathPart(path){
        return /^(.+)\/(.*)$/m.exec(path) || "";
    },

    /**
     * @summary test if path correspond to one of the resource file type
     * @param path full path
     * @returns {true|false}
     */
    isResourceFile: function (path) {
        return this.isComposeFile(path) || this.isStackDefinition(path) ||  this.isStackInstance(path) ||  this.isSimpleStackInstance(path) || this.isImageConfig(path) || this.isDockerfile(path);
    },

    isComposeFile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockercompose, fileName);
    },

    isStackDefinition: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackdefinition, fileName);
    },

    isStackInstance: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackinstance, fileName);
    },

    isSimpleStackInstance: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.simplestackinstance, fileName);
    },

    isDockerfile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockerfile, fileName);
    },

    isImageConfig: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.imageconfig, fileName);
    },

    /**
     * thanks to https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
     */
    walkResourceFile: function(dir, done) {
        var self = this;
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        self.walkResourceFile(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        if(self.isResourceFile(file)) {
                            results.push(file);
                        }
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    }


};


/* CODE SAMPLE

 READ FILE SYNC
 var data;
 try {
 data = fs.readFileSync(path, {encoding: 'utf-8'});
 } catch (err) {
 if (err.code === 'ENOENT') {
 console.log("file not found for " + path);
 } else {
 console.error(`Error while reading file ${path}:`, err);
 throw err;
 }
 }

 if(data) {
 console.log('File for\n', composeFile, "\n", data);

 var config = JSON.parse(data);
 } else {
 console.info(`Action was not performed because ${file} was not found`);
 }


 */
