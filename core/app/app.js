// var http = require('http');
var fs = require('fs');
var path = require('path')
require("dockerode/package.json"); // dockerode is a peer dependency.
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var YAML = require('yamljs');
var _ = require("underscore");



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
            imageConfig = fileState.fileName.replace("Dockerfile", "image") + ".json" //TODO not this way anymore
        } else if (utils.isImageConfig(fileState.fileName)) {
            imageConfig = fileState.fileName;
            Dockerfile = fileState.fileName.replace("image", "Dockerfile").replace(".json", "")  //TODO not this way anymore
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


        //read build contexts for all happy couples
        let contextPaths = [];// {path: /path/to/deps, name: resource name}
        happyCouples.forEach(couple => {
            if(couple.dockerfile){
                //dockerfile: config.context (relative to current dir) or current dir
                let config = JSON.parse(fs.readFileSync(couple.config, {encoding: 'utf-8'}));
                let path = utils.removeLastPathPart(config.config);
                if(config.context){
                    path = `${path}/${config.context}`
                }
                path = repoFolder+path;
                path = path.replace("\/\/","/");//justincase
                contextPaths.push({name: couple.name, path: path});
            } else if(couple.dockercompose){
                console.log("ouple.dockercomposev",couple.dockercompose);
                //dockercompose: all services.context (relative to current dir)
                let dockercompose = YAML.load(couple.dockercompose);
                console.log("dockercompose",dockercompose)
                let path = utils.removeLastPathPart(couple.dockercompose);
                if(dockercompose.services)
                    Object.keys(dockercompose.services).forEach( name => {
                        let service = dockercompose.services[''+name];
                        if(service.build && service.build.context){
                            contextPaths.push({name: couple.name, path: `${path}/${service.build.context}`});
                        }
                });
            }
        });

        console.log("All context path used by the valid couple found:")
        console.log(contextPaths);


        //hand over to getGitDiffModifiedFile
        getGitDiffModifiedFile(happyCouples, contextPaths)

    });
}

function getGitDiffModifiedFile(happyCouples, contextPaths) {
    console.info("Reading git commit payload to find which files has been modified");
    var modifiedFiles = "cd " + repoFolder + "; git diff-tree --no-commit-id --name-status $(git rev-parse HEAD)"
    //TODO
    //use this git diff-tree --stat --no-commit-id $(git rev-parse HEAD)
    /*


excecpct this

     stackwithcontext/marseille/Dockerfile-marseille | 2 +-
     1 file changed, 1 insertion(+), 1 deletion(-)

via regepx

     */
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
            console.log("All updated files\n", filesState);

            filesState.forEach(function (fileState) {
                console.log(fileState.fileName, "has been", fileState.state);

                if(utils.isResourceFile(fileState.fileName)){
                    const resourceName = utils.getTypeAndResourceName(fileState.fileName).name;
                    console.log(`${fileState.fileName} is a resource file for ${resourceName}`);
                    let couple = _.find(happyCouples, function(couple){ return couple.name === resourceName});
                    couple.contextChanged = true;
                    couple.fileState = fileState;
                } else {
                    //is updated files part of resource context ?
                    const updatedFileDirectory = repoFolder + utils.removeLastPathPart(fileState.fileName);
                    let updatedContextPaths = _.filter(contextPaths, function (context) {
                        return context.path.startsWith(updatedFileDirectory)
                    });
                    updatedContextPaths.forEach(updatedContext => {
                        console.log(`${fileState.fileName} is at least part of one context of ${updatedContext.name}`);
                        _.find(happyCouples, function (couple) {
                            return couple.name === updatedContext.name
                        }).contextChanged = true;
                    });
                }
            });
        }

        console.log("Summary of what is going to be effectively done according to updated files");
        let counselorReadyCouple = _.filter(happyCouples, function(couple){ return couple.contextChanged });
        counselorReadyCouple.forEach(couple => {
            let actions = "";
            if(couple.dockerfile)
                actions = "built";
            else if(couple.dockercompose)
                actions = "built and deployed";

           console.log(`${couple.name} has been scheduled to be ${actions}`)
        });


        console.log("****************");
        console.log("Here comes Moby");
        console.log("****************");


        counselorReadyCouple.forEach(couple => {
            if(couple.dockerfile){
                if(couple.fileState)
                    manageImage(couple.fileState);
                else
                    console.log(`${couple.name} has been scheduled to be built 'cause its context has been updated but it's not implemented yet`)
            } else if(couple.dockercompose){
                if(couple.fileState)
                    manageStack(couple.fileState);
                else
                    console.log(`${couple.name} has been scheduled to be built 'cause its context has been updated but it's not implemented yet`)            }
        });

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