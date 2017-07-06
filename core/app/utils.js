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

    isResourceFile: function (resource, fileName) {
        var split = fileName.split("/");
        if (split[split.length - 1].indexOf(resource) !== -1) return true;
        return false;
    },

    isComposeFile: function (fileName) {
        return this.isResourceFile("docker-compose", fileName);
    },

    isStackConfig: function (fileName) {
        return this.isResourceFile("stack", fileName);
    },

    isImageConfig: function (fileName) {
        return this.isResourceFile("image", fileName);
    },

    isDockerfile: function (fileName) {
        return this.isResourceFile("Dockerfile", fileName);
    }
}
