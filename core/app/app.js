// var http = require('http');
var fs = require('fs');
var path = require('path')
require("dockerode/package.json"); // dockerode is a peer dependency.
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});


var utils = require("./utils");

//config var
var curlUnixDockerSocket = 'curl --unix-socket /var/run/docker.sock '
var requestDockerApiVersion = ' http:/v1.30/';
var containers = 'containers/json';
console.log("env",process.env);
if (!process.env.CI_PROJECT_DIR) {
    console.error("CI_PROJECT_DIR is not defined or empty");
    process.exit(1)
}
var repoFolder = process.env.CI_PROJECT_DIR + "/";
var artifactDir = "/job-result/";
var resultFile = "result.json";

console.log("Starting...  ...");

function manageStack(fileState) {
    var stackName = getStackName(fileState.fileName);

    if (fileState.state == "D") {
        console.log(fileState.fileName, "has been deleted, remove associated stack", stackName);
        deployStack(fileState.fileName, "remove", stackName);
    } else {
        var stackConfig;
        var composeFile;
        if (utils.isComposeFile(fileState.fileName)) {
            composeFile = fileState.fileName;
            stackConfig = fileState.fileName.replace("docker-compose", "stack").replace(".yml", ".json")
        } else if (utils.isStackConfig(fileState.fileName)) {
            stackConfig = fileState.fileName
            composeFile = fileState.fileName.replace("stack", "docker-compose").replace(".json", ".yml")
        }

        var configFile = path.join(repoFolder, stackConfig);

        var data;
        try {
            data = fs.readFileSync(configFile, {encoding: 'utf-8'});
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log("Config json file not found for " + composeFile);
            } else {
                console.error("Error while reading config json file:", err);
                throw err;
            }
        }

        if(data) {
            console.log('Config for\n', composeFile, "\n", data);

            var config = JSON.parse(data);
            var action;

            if (config.enabled) {
                action = "update"
            } else {
                action = "remove"
            }

            deployStack(composeFile, action, stackName);
        } else {
            console.info("Action was not performed on",stackName,"because its config file was not found");
        }
    }
};

function manageImage(fileState) {
    if (fileState.state == "D") {
        console.log(fileState.fileName, "has been deleted, doint nothing, GC wil be there soon... ");
        utils.writeResult(artifactDir, resultFile, repoFolder, fileState.fileName, {result: "has been deleted"});
        return;
    } else {
        var imageConfig;
        var Dockerfile;
        if (utils.isDockerfile(fileState.fileName)) {
            Dockerfile = fileState.fileName;
            imageConfig = fileState.fileName.replace("Dockerfile", "image") + ".json"
        } else if (utils.isImageConfig(fileState.fileName)) {
            imageConfig = fileState.fileName;
            Dockerfile = fileState.fileName.replace("image", "Dockerfile").replace(".json", "")
        }

        var configFile = path.join(repoFolder, imageConfig);
        var data;
        try {
            data = fs.readFileSync(configFile, {encoding: 'utf-8'});
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log("file not found for " + configFile);
            } else {
                console.error(`Error while reading file ${configFile}:`, err);
                throw err;
            }
        }

        if(data) {
            console.log('Config file for\n', Dockerfile, "\n", data);

            var config = JSON.parse(data);
            buildPushImage(Dockerfile, config);

        } else {
            console.info(`Action was not performed because ${configFile} was not found`);
        }

    }
}

function getAllResourceFiles(){

    console.log("Reading repository to find resource files and create couple (resource file + related config file");

    utils.walkResourceFile(repoFolder, function(err, allResourcePaths){
        //let's make couple like this: name : { config: /path/to/config, [dockercompose|dockerfile]: /path/to/related/resource }
        let meetic = {};
        allResourcePaths.forEach(path => {
            let typeAndResourceName = utils.getTypeAndResourceName(path);
            let name = typeAndResourceName.name;
            let type = typeAndResourceName.type;

            if(!meetic[name])
                meetic[name] = {type: ""};

            if(type.indexOf("config") != -1){
                if(!meetic[name]['config']) {
                    meetic[name]['config'] = path;
                    meetic[name].type = type.replace("config", "");
                } else
                    meetic[name]['error'] = `${name} more than one config found: ${meetic[name]['config']} and ${path}`;
            } else {
                if(!meetic[name][type])
                    meetic[name][type] = path;
                else
                    meetic[name]['error'] = `${name} more than one resource found: ${meetic[name][type]} and ${path}`;
            }
        });

        //now cleaning the malformed couples
        let happyCouples = []; // {name: name, [dockerfile|dockercompose]: /path/to/resource, config: /path/tpo/config}
        Object.keys(meetic).forEach((name) => {
            let yes = false;
            let files = meetic[name];
            if (files.error) {
                console.log(files.error, `${name} will not be processed`);
            } else {
                if (!files.config) {
                    console.log(`${name} doesnt' have a config file, will not be processed`);
                } else {
                    if (files.type == "image") {
                        if (!files.dockerfile)
                            console.log(`${name} doesnt' have a corresponding Dockerfile, will not be processed`);
                        else
                            yes = true;
                    } else if (files.type == "stack") {
                        if (!files.dockercompose)
                            console.log(`${name} doesnt' have a corresponding docker-compose, will not be processed`);
                        else
                            yes = true
                    }
                }
            }

            if (yes) {
                console.log(`${name} will be processed as a ${files.type}`);
                files.name = name;
                happyCouples.push(files)
            }
        });

        console.log("All valid resources couple found:")
        console.log(happyCouples);


        //todo
        //read build deps for all happy couples
        happyCouples.forEach(couple => {
            if(couple.dockerfile){
                //dockerfile: config.context (relative to current dir) or current dir
                var config = JSON.parse(fs.readFileSync(couple.config, {encoding: 'utf-8'}));
                if(config.context){

                }



            } else if(couple.dockercompose){
                //dockercompose: all services.context (relative to current dir)

            }
        });


        //hand over to getGitDiffModifiedFile

    })
}

function getGitDiffModifiedFile() {
    var modifiedFiles = "cd " + repoFolder + "; git diff-tree --no-commit-id --name-status $(git rev-parse HEAD)"
    utils.execCmd(modifiedFiles, function (error, stdout) {
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
            console.log("Updated files\n", filesState);

            filesState.forEach(function (fileState) {
                console.log(fileState.fileName, "has been", fileState.state);

                //TODO check if dependencies match one of the found resource files

                if (utils.isComposeFile(fileState.fileName) || utils.isStackConfig(fileState.fileName)) {
                    manageStack(fileState);
                }

                if (utils.isDockerfile(fileState.fileName) || utils.isImageConfig(fileState.fileName)) {
                    manageImage(fileState)
                }
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

function deployStack(composeFile, action, stackName) {
    var shDockerStackDeploy;
    var curlDockerStackDeploy;
    if (action == "create" || action == "update") {
        shDockerStackDeploy = "docker stack deploy --compose-file " + repoFolder + composeFile + ' ' + stackName;
    } else if (action == "remove") {
        shDockerStackDeploy = "docker stack rm " + stackName;
    } else {
        utils.writeResult(artifactDir, resultFile, repoFolder, stackName, {error: "Action was not defined for stack"});
        console.error("Action not any of create, update or remove for ", stackName);
        return;
    }
    //if composeFile is yml => Docker API
    //if composeFile is json => Docker HTTP API (doesn't support stack yet)
    utils.execCmd(shDockerStackDeploy, function (error, stdout, stderr) {
        utils.writeResult(artifactDir, resultFile, repoFolder, stackName, getState(error, stderr, stdout));
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

function pushImage(config) {
    var dockerTag = "docker tag " + config.tag + " " + config.push;
    utils.execCmd(dockerTag, function (error, stdout, stderr) {
        var dockerPush = "docker push " + config.push;
        utils.execCmd(dockerPush, function (error, stdout, stderr) {
            utils.writeResult(artifactDir, resultFile, repoFolder, config.push, getState(error, stderr, stdout));
        })
    })
}

function buildPushImage(Dockerfile, config) {
    if (!config.tag) {
        console.log("Dockerfile", Dockerfile, "doesn't have a valid tag in its config");
    }

    var dockerBuild = "docker build -f " + Dockerfile + " -t " + config.tag + " . ";
    utils.execCmd(dockerBuild, function (error, stdout, stderr) {
        utils.writeResult(artifactDir, resultFile, repoFolder, config.tag, getState(error, stderr, stdout));

        if (config.push) pushImage(config);
    })
}

getAllResourceFiles()

console.log("End of script, waiting for callbacks to answer");