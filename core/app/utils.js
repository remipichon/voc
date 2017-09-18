var exec = require('child_process').exec;
// var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path')


module.exports = {

    writeResult: function (artifactDir, resultFile, repoFolder, key, value) {
        var resultFile = artifactDir + resultFile;
        var pathResult = path.join(repoFolder, resultFile);

        var resultJson = {};
        if (fs.existsSync(pathResult)) {
            var resultTest = fs.readFileSync(resultFile).toString();
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
        fs.writeFileSync(pathResult, JSON.stringify(resultJson));
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

    getResourceName(pattern, path){
        let match;
        if(match = pattern.exec(path)){
            return match[1]
        } else {
            return null;
        }
    },

    getTypeAndResourceName(path){
        //TODO
    },

    /**
     * @summary test if path correspond to one of the resource file type
     * @param path full path
     * @returns {true|false}
     */
    isResourceFile: function (path) {
        return this.isComposeFile(path) || this.isStackConfig(path) || this.isImageConfig(path) || this.isDockerfile(path);
    },

    isComposeFile: function (fileName) {
        return this._isResourceFile(/docker-compose_([a-zA-Z0-9]+).yml$/gm, fileName);
    },

    isStackConfig: function (fileName) {
        return this._isResourceFile(/docker-compose_([a-zA-Z0-9]+)_config.json/gm, fileName);
    },

    isImageConfig: function (fileName) {
        return this._isResourceFile(/Dockerfile_([a-zA-Z0-9]+)/, fileName);
    },

    isDockerfile: function (fileName) {
        return this._isResourceFile(/Dockerfile_([a-zA-Z0-9]+)_config.json/, fileName);
    }
};


