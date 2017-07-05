// var http = require('http');
var exec = require('child_process').exec;
// var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path')

require("dockerode/package.json"); // dockerode is a peer dependency.
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var prefix = 'curl --unix-socket /var/run/docker.sock ';
var containers = prefix + ' http:/v1.27/containers/json';

console.log("Starting...  ...");

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

function manageImage(fileState) {
    if (fileState.state == "D") {
        console.log(fileState.fileName, "has been deleted, doint nothing, GC wil be there soon... ");
        writeResult(fileState.fileName, {error: "has been deleted"});
        return;
    } else {
        var imageConfig;
        var Dockerfile;
        if (isDockerfile(fileState.fileName)) {
            Dockerfile = fileState.fileName;
            imageConfig = fileState.fileName.replace("Dockerfile", "image") + ".json"
        } else if (isImageConfig(fileState.fileName)) {
            imageConfig = fileState.fileName;
            Dockerfile = fileState.fileName.replace("image", "Dockerfile").replace(".json", "")
        }

        var configFile = path.join("/builds/root/test-runner/", imageConfig);
        fs.readFile(configFile, {encoding: 'utf-8'}, function (err, data) {
            if (!err) {
                console.log('Config for', Dockerfile, data);
                var config = JSON.parse(data);
                buildPushImage(Dockerfile, config);
            } else {
                console.log("Config json file not found for " + Dockerfile, "with error", err);
                console.log(err);
            }
        });
    }
}

function getGitDiffModifiedFile() {
    var modifiedFiles = "cd /builds/root/test-runner/; git diff-tree --no-commit-id --name-status $(git rev-parse HEAD)"
    execCmd(modifiedFiles, function (error, stdout) {
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

                if (isDockerfile(fileState.fileName) || isImageConfig(fileState.fileName)) {
                    manageImage(fileState)
                }
            })
        }
    });
}

function writeResult(key, value) {
    var resultFile = "job-result/result.json";
    var pathResult = path.join("/builds/root/test-runner/", resultFile);

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
    if (!fs.existsSync("/builds/root/test-runner/job-result")) {
        fs.mkdirSync("/builds/root/test-runner/job-result");
    }
    console.log("resultJson", resultJson);
    var contents = fs.writeFileSync(pathResult, JSON.stringify(resultJson));

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

function isResourceFile(resource, fileName) {
    var split = fileName.split("/");
    if (split[split.length - 1].indexOf(resource) !== -1) return true;
    return false;
}

function isComposeFile(fileName) {
    return isResourceFile("docker-compose", fileName);
}

function isStackConfig(fileName) {
    return isResourceFile("stack", fileName);
}

function isImageConfig(fileName) {
    return isResourceFile("image", fileName);
}

function isDockerfile(fileName) {
    return isResourceFile("Dockerfile", fileName);
}

function deployStack(composeFile, action, stackName) {
    var shDockerStackDeploy
    if (action == "create" || action == "update") {
        shDockerStackDeploy = "docker stack deploy --compose-file /builds/root/test-runner/" + composeFile + ' ' + stackName;
    } else if (action == "remove") {
        shDockerStackDeploy = "docker deploy rm " + stackName;
    } else {
        writeResult(stackName, {error: "Action was not defined for stack"});
        console.error("Action not any of create, update or remove for ", stackName);
        return;
    }
    execCmd(shDockerStackDeploy, function (error, stdout, stderr) {
        writeResult(stackName, getState(error, stderr, stdout));
    })
}

function getState(error, stderr, stdout) {
    var state = {};
    if (error) {
        state.error = stderr + " : " + JSON.stringify(error);
    } else {
        state.result = stdout || stderr;
    }
    return state;
};

function buildPushImage(Dockerfile, config) {
    if (!config.tag) {
        console.log("Dockerfile", Dockerfile, "doesn't have a valid tag in its config");
    }

    var dockerBuild = "docker build -f " + Dockerfile + " -t " + config.tag + " . ";
    execCmd(dockerBuild, function (error, stdout, stderr) {
        writeResult(config.tag, getState(error, stderr, stdout));

        if (config.push) {
            var dockerTag = "docker tag " + config.tag + " " + config.push;
            execCmd(dockerTag, function (error, stdout, stderr) {
                var dockerPush = "docker push " + config.push;
                execCmd(dockerPush, function (error, stdout, stderr) {
                    writeResult(config.push, getState(error, stderr, stdout));
                })
            })
        }
    })
}

function execCmd(cmd, callback) {
    exec(cmd, function (error, stdout, stderr) {
        // command output is in stdout
        if (error) console.error("error", error)
        console.log(stdout)
        if (stderr) console.error("stderr", stderr)
        if (callback) callback(error, stdout, stderr)
    });
}

getGitDiffModifiedFile();

console.log("End of script, waiting for callbacks to answer");