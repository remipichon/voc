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


    resourceTypeLabel: {
        "dockercompose": "docker compose",
        "stackconfig": "stack json config",
        "dockerfile": "Dockerfile",
        "imageconfig": "imate json config"
    },

    resourceTypeRegex: {
        "dockercompose": /docker-compose_([a-zA-Z0-9]+).yml$/m,
        "stackconfig": /docker-compose_([a-zA-Z0-9]+)_config.json$/m,
        "dockerfile": /Dockerfile_([a-zA-Z0-9]+)$/m,
        "imageconfig": /Dockerfile_([a-zA-Z0-9]+)_config.json$/m
    },

    getResourceName(pattern, path){
        var match = pattern.exec(path)
        //console.log(pattern, path,match)
        if (match) {
            return match[1]
        } else {
            return null;
        }
    },

    getTypeAndResourceName(path){
        if (this.isComposeFile(path))
            return {
                name: this.getResourceName(this.resourceTypeRegex.dockercompose, path),
                type: "dockercompose"
            };
        if (this.isStackConfig(path))
            return {
                name: this.getResourceName(this.resourceTypeRegex.stackconfig, path),
                type: "stackconfig"
            };
        if (this.isDockerfile(path))
            return {
                name: this.getResourceName(this.resourceTypeRegex.dockerfile, path),
                type: "dockerfile"
            };
        if (this.isImageConfig(path))
            return {
                name: this.getResourceName(this.resourceTypeRegex.imageconfig, path),
                type: "imageconfig"
            };
        return null;
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
        return this._isResourceFile(this.resourceTypeRegex.dockercompose, fileName);
    },

    isStackConfig: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackconfig, fileName);
    },

    isDockerfile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockerfile, fileName);
    },

    isImageConfig: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.imageconfig, fileName);
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
