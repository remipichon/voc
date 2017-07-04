var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var stream = require('stream');
// var http = require('http');
var exec = require('child_process').exec;
// var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path')

require("dockerode/package.json"); // dockerode is a peer dependency.
var Docker = require('dockerode');
var DockerEvents = require('docker-events');
var docker = new Docker({socketPath: '/var/run/docker.sock'});

console.log("Starting...  ...");


var prefix = 'curl --unix-socket /var/run/docker.sock '
var containers = prefix + ' http:/v1.27/containers/json';

// var composeFile = "/root/configuration/docker-compose.yml";
// var name = "girafe";
// deployStack(composeFile, name);


function manageStack(fileState) {
    var stackName = getStackName(fileState.fileName);

    if (fileState.state == "D") {
        console.log(fileState.fileName, "has been deleted, remove associated ", stackName);
        deployStack(fileState.fileName, "remove", stackName);
    } else {
        var stackConfig;
        var composeFile;
        if (isComposeFile(fileState.fileName)) {
            composeFile = fileState.fileName;
            stackConfig = fileState.fileName.replace("docker-compose", "stack").replace(".yml", ".json")
        } else if (isStackConfig(fileState.fileName)) {
            stackConfig = fileState.fileName
            composeFile = fileState.fileName.replace("stack", "docker-compose").replace(".json", ".yml")
        }

        var configFile = path.join("/builds/root/test-runner/", stackConfig);
        fs.readFile(configFile, {encoding: 'utf-8'}, function (err, data) {
            if (!err) {
                console.log('Config for', composeFile, data);

                var config = JSON.parse(data);
                var action;

                if (config.enabled) {
                    action = "update"
                } else {
                    action = "remove"
                }

                deployStack(composeFile, action, stackName);

            } else {
                console.log("Config json file not found for " + composeFile, "with error", err);
                console.log(err);
            }
        });
    }
};

function getGitDiffModifiedFile() {
    var modifiedFiles = "cd /builds/root/test-runner/; git diff-tree --no-commit-id --name-status $(git rev-parse HEAD)"
    execCmd(modifiedFiles, function (error, stdout) {
        console.log(error);
        console.log(stdout);

        if (stdout) {
            var files = stdout.split("\n");
            var filesState = [];
            files.forEach(function (file) {
                var spec = file.split("\t");
                if (!spec[0] || !spec[1]) return;
                filesState.push({
                    state: spec[0],
                    fileName: spec[1]
                })
            });
            console.log("Updated files", filesState);

            filesState.forEach(function (fileState) {
                console.log(fileState.fileName, "has been", fileState.state);

                if (isComposeFile(fileState.fileName) || isStackConfig(fileState.fileName)) {
                    manageStack(fileState);
                }

                //TODO if Dockerfile
            })
        }
    });
}

function getStackName(fileName) {
    var split = fileName.split("/");
    var last = split[split.length - 1];
    if (last.indexOf("docker-compose") !== -1) {
        return last.replace("docker-compose-", "").replace(".yml", "");
    } else if (last.indexOf("stack-") !== -1) {
        return last.replace("stack-", "").replace(".json", "");
    }
}

function isComposeFile(fileName) {
    var split = fileName.split("/");
    if (split[split.length - 1].indexOf("docker-compose") !== -1) return true;
    return false;
}

function isStackConfig(fileName) {
    var split = fileName.split("/");
    if (split[split.length - 1].indexOf("stack") !== -1) return true;
    return false;
}

function deployStack(composeFile, action, stackName) {
    var shDockerStackDeploy
    if (action == "create" || action == "update") {
        shDockerStackDeploy = "docker stack deploy --compose-file /builds/root/test-runner/" + composeFile + ' ' + stackName;
    } else if (action == "remove") {
        shDockerStackDeploy = "docker stack rm " + stackName;
    } else {
        console.error("Action not any of create, update or remove for ", stackName);
        return;
    }
    execCmd(shDockerStackDeploy)
}


function execCmd(cmd, callback) {
    var callback = callback || function (error, stdout, stderr) {
            // command output is in stdout
            if (error) console.error("error", error)
            console.log(stdout)
            if (stderr) console.error("stderr", stderr)
        }
    exec(cmd, callback);
}

getGitDiffModifiedFile();
console.log("End of script, waiting for callbacks to answer")