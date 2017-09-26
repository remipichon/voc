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
var artifactDir = "job-result/";
var resultFile = "result.json";

console.log("Starting...  ...");

function manageStack(couple) {
    if (couple.clean) {
        console.log("Either docker-compose or config file for",couple.name, "has been deleted, remove associated stack");
        deployStack(couple.dockercompose, "remove", couple.name);
    } else {
        var data;
        try {
            data = fs.readFileSync(couple.config, {encoding: 'utf-8'});
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log("Config json file not found for " + couple.dockercompose);
            } else {
                console.error("Error while reading config json file:", err);
                throw err;
            }
        }

        if (data) {
            console.log('Config for\n', couple.dockercompose, "\n", data);

            var config = JSON.parse(data);
            var action;

            if (config.enabled) {
                action = "update"
            } else {
                action = "remove"
            }

            deployStack(couple.dockercompose, action, couple.name);
        } else {
            console.info("Action was not performed on", couple.name, "because its config file was not found");
        }
    }
};

function manageImage(couple) {
    if (couple.clean) {
        console.log("Either Dockerfile or config file for",couple.name, "has been deleted, doint nothing, GC wil be there soon... ");
        utils.writeResult(artifactDir, resultFile, repoFolder, couple.name, {result: "has been unscheduled"});
        return;
    } else {
        var data;
        try {
            data = fs.readFileSync(couple.config, {encoding: 'utf-8'});
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log("file not found for " + couple.config);
            } else {
                console.error(`Error while reading file ${couple.config}:`, err);
                throw err;
            }
        }

        if (data) {
            console.log('Config file for\n', couple.dockerfile, "\n", data);

            var config = JSON.parse(data);
            buildPushImage(couple.dockerfile, config);

        } else {
            console.info(`Action was not performed because ${configFile} was not found`);
        }
    }
}

function getAllResourceFiles(){

    console.info("Reading repository to find resource files and create couple (resource file + related config file");

    utils.walkResourceFile(repoFolder, function(err, allResourcePaths){
        //we are now reading all the resource file to make couple and then determine which couples need to see the counselor (Moby) according to the Git modified files

        let singles = [];       // name, type, path, if instance: soulMateName, if instance: suffix
        let instances = [];     // instanceName, path, if type==si: stackDefinitionName, if type==ssi: dockercomposeName
        let dockercomposes = [];    //name, path
        let stackDefinitions = [];  //name, path, dockercomposes (names)

        //populating singles
        allResourcePaths.forEach(path => {
            let typeAndResourceName = utils.getTypeAndResourceName(path);
            let name = typeAndResourceName.name;
            let type = typeAndResourceName.type;

            if(type == "dockerfile" || type == "imageconfig"){
                console.log("dockerfile and imageconfig are not supported yet");
            } else {
                //for instance only
                let soulMate = typeAndResourceName.soulMate;
                let suffix = typeAndResourceName.suffix;

                let single = {
                    name: name,
                    type: type,
                    path: path
                };
                if(soulMate) //only instances have soul mate
                    single.soulMateName = soulMate;
                if(suffix)  //only instances have soul suffix
                    single.suffix = suffix;
                singles.push(single);
            }
        });

        dockercomposes = _.filter(singles, single => { return single.type === "dockercompose" });
        dockercomposes = _.map(dockercomposes, dockercompose => { return { name: dockercompose.name, path: dockercompose.path} });

        stackDefinitions = _.filter(singles, single => { return single.type === "stackDefinition" });
        stackDefinitions = _.map(stackDefinitions, stackDefinition => { return { name: stackDefinition.name, path: stackDefinition.path} });

        console.log("***** Here is what I could extract from the file system *****");
        console.log("singles\n",singles);
        console.log("*****                                                   *****");
        console.log("dockercomposes\n",dockercomposes);
        console.log("*****                                                   *****");
        console.log("stackDefinitions\n",stackDefinitions);
        console.log("*****           That's all from the file system         *****");


        //populating instances
        let usedStackDefinitions = []; // List<String>
        singles.forEach(single => {
            if(single.type === "simpleStackInstance" || single.type === "stackInstance") {
                let instance = {
                    instanceName: single.name,
                    path: single.path,
                };
                if(single.type === "stackInstance") {
                    let stackDefinition = _.find(stackDefinitions, stackDefinition => { return stackDefinition.name == single.soulMateName });
                    if(!stackDefinition){
                        console.warn(`File ${single.name} with path ${single.path} is looking for stack definition ${single.soulMateName} which is not defined`);
                        return;
                    }
                    instance.stackDefinitionName = stackDefinition.name;
                    usedStackDefinitions.push(stackDefinition.name);
                }
                if(single.type === "simpleStackInstance") {
                    let usedDockercompose = _.find(dockercomposes, dockercompose => { return dockercompose.name == single.soulMateName });
                    if(!usedDockercompose){
                        console.warn(`File ${single.name} with path ${single.path} is looking for dockercompose ${single.soulMateName} which couldn't not be found, skipping`);
                        return;
                    }
                    instance.dockercomposeName = usedDockercompose.name;
                    usedDockercompose.used = true;
                }
                instances.push(instance);
            }
        });

        console.log("***** Here are all the valid instances *****");
        console.log("instances\n",instances);


        //remove stack definitions not used by any instances
        stackDefinitions = _.filter(stackDefinitions, stackDefinition => { return _.contains(usedStackDefinitions,stackDefinition.name); });

        console.log("***** Here are all actually used stack definitions *****");
        console.log("stackDefinitions\n",stackDefinitions);

        //remove dockercomposes not used by any instances
        stackDefinitions.forEach(stackDefinition => {
            let stackDefinitionConfig = fs.readFileSync(stackDefinition.name, {encoding: 'utf-8'});
            if(stackDefinitionConfig.dockercomposes && Array.isArray(stackDefinitionConfig.dockercomposes)){
                stackDefinitionConfig.dockercomposes.forEach(dockercomposeRelativePath => {
                    let dockercomposeName = utils.getTypeAndResourceName(dockercomposeRelativePath);
                    if(!dockercomposeName) {
                        console.warn(`Stack definition is looking for docker compose ${dockercomposeRelativePath} which is not a valid file name format, skipping`);
                    }
                    let usedDockercompose = dockercomposes.find(dockercompose => { return dockercompose.name === dockercomposeName });
                    if(!usedDockercompose){
                        console.warn(`Stack definition is looking for docker compose ${dockercomposeRelativePath} which could'nt be found, skipping`);
                    }
                    usedDockercompose.used = true;
                });

                stackDefinition.dockercomposes = _.map(dockercomposes, dockercompose => { return this.name; });
            }
        });
        dockercomposes = _.filter(dockercomposes, dockercompose => { return dockercompose.used });

        console.log("***** Here are all actually used docker composes *****");
        console.log("dockercomposes\n",dockercomposes);

        //get all the contexts
        let contextPaths = [];  //  path, name
        dockercomposes.forEach(dc => {
            let dockercompose = YAML.load(dc.path);
            let path = utils.removeLastPathPart(dc.path);
            if(dockercompose.services) {
                Object.keys(dockercompose.services).forEach(name => {
                    let service = dockercompose.services[name];
                    if (service.build) {
                        service.build.forEach(build => {
                            dc.hasBuild = true;
                            contextPaths.push({name: dc.name, directory: `${path}/${build.context}`, type: "dockercompose"});
                        })
                    }
                });
            }
        });

        console.log("***** Here are all the contexts used by one of the valid used docker composes *****");
        console.log(contextPaths);

        getGitDiffModifiedFile(contextPaths, instances, stackDefinitions, dockercomposes);


    //get context for image
    // if(couple.dockerfile){
    //     //dockerfile: config.context (relative to current dir) or current dir
    //     let config = JSON.parse(fs.readFileSync(couple.config, {encoding: 'utf-8'}));
    //     let path = utils.removeLastPathPart(config.config);
    //     if(config.context){
    //         path = `${path}/${config.context}`
    //     }
    //     path = repoFolder+path;
    //     path = path.replace("\/\/","/");//justincase
    //     contextPaths.push({name: couple.name, path: path});
    //

    });
}

let triggerInstancesForResource = function (resource, instances , stackDefinitions, clean = false) {
    if (resource.type === "dockercompose") {
        //all simpleStackInstance
        console.log("resource",resource, "instances",instances);
        _.filter(instances, instance => {
            return instance.dockercomposeName == resource.name;
        }).forEach(instance => {
            instance.changed = true;
            instance.clean = clean;
        });
        //all stackInstance whose stackDefinition contains dockercompose
        let relatedStackDefinitions = stackDefinitions.filter(stackDefinition => {
            _.contains(stackDefinition.dockercomposes, resource.name);
        });
        _.filter(instances, instance => {
            return _.contains(relatedStackDefinitions, instance.stackDefinitionName);
        }).forEach(instance => {
            instance.changed = true;
            instance.clean = clean;
        });
    } else if (resource.type === "stackDefinition") {
        _.filter(instances, instance => {
            return instance.stackDefinitionName === resource.name;
        }).forEach(instance => {
            instance.changed = true;
            instance.clean = clean;
        });
    } else if (resource.type === "stackInstance") {
        let si = _.find(instances, instance => {
            return instance.instanceName === resource.name;
        });
        si.changed = true;
        si.clean = clean;
    } else if (resource.type === "simpleStackInstance") {
        let ssi = _.find(instances, instance => {
            return instance.instanceName === resource.name;
        });
        ssi.changed = true;
        ssi.clean = clean;
    }
};
/**
 *
 * @param contextPaths          //  path, directory      (only dockercompose at the moment)
 * @param instances             // instanceName, path, if type==si: stackDefinitionName, if type==ssi: dockercomposeName
 * @param stackDefinitions      //name, path, dockercomposes
 * @param dockercomposess       //name, path
 */
function getGitDiffModifiedFile(contextPaths, instances, stackDefinitions, dockercomposes) {
    console.info("Reading git commit payload to find which files has been modified");
    var modifiedFiles = "cd " + repoFolder + ";git diff-tree --no-commit-id --name-status -r $(git rev-parse HEAD)";

    utils.execCmd(modifiedFiles, function (error, stdout) {
        if(error){
            console.error("Error executing",modifiedFiles,error);
        }

        if (stdout) {
            let allLines = stdout.split("\n") //I couldn't do it by Regexp

            let files = [];
            allLines.forEach(line => {
                var fileMatch = /^([ACDMRTUXB])\s+([^\s]+)$/m.exec(line);      //match  type    path/to/file
                if(fileMatch) {
                    files.push({file: repoFolder + fileMatch[2], status: fileMatch[1]});
                }

            });

            console.log("*****************");
            console.log("All updated files\n", files);
            console.log("*****************");


            files.forEach(function (file) {
                let fileName = file.file;
                console.log("Now computing:",fileName);

                if(utils.isResourceFile(fileName)){
                    let state = file.status;
                    //Added (A), Copied (C), Deleted (D), Modified (M), Renamed (R), have their type (i.e. regular file, symlink, submodule, …​) changed (T), are Unmerged (U), are Unknown (X), or have had their pairing Broken (B).
                    //state is only relevant for resource file, precisely it has to be known whether the resource should be 'cleaned' or 'used' (build, deploy, push....)
                    //(A) and (M) => resource can be 'used'
                    //(D) and (U) => resource can be 'cleaned'
                    //I honestly never experienced (C) or (R) or (X). Renaming a file seems to produce a (D) and a (A), which is good. Copying a file just create a (A) which will not make it an happy couple and therefore will not be managed at all
                    //Copying resource file without changing its name (just to another directory) will make the resource to be ignored until one of the duplicated files is deleted.
                    let resource = utils.getTypeAndResourceName(fileName);
                    let name = resource.name ;
                    if(!name){
                        console.log(`file ${fileName} is not a valid resource file, trying as normal file`);
                    } else {
                        console.log(`${fileName} is a resource file for ${name}`);
                        let clean = false;
                        if (state == "D" || state == "U") {
                            clean = true;
                        }
                        triggerInstancesForResource(resource, instances, stackDefinitions, clean);
                        return;
                    }
                }


                //is updated files part of resource context ?
                const updatedFileDirectory = utils.removeLastPathPart(fileName);
                let updatedContextPaths = _.filter(contextPaths, function (context) {
                    return updatedFileDirectory.startsWith(context.directory);
                });

                updatedContextPaths.forEach(updatedContext => {
                    if(updatedContext.type == "dockercompose"){
                        let dockercompose = dockercomposes.find(dc => { return dc.name === updatedContext.name});
                        let resource = utils.getTypeAndResourceName(dockercompose.path);

                        if(!resource){
                            console.log(`resource ${updatedContext.name} doest not reference a valid resource`);
                            return;
                        }
                        triggerInstancesForResource(resource, instances, stackDefinitions);
                    }
                });
            });
        }

        console.log("Summary of what is going to be effectively done according to updated files");
        let triggeredInstances = _.filter(instances, function(instance){ return instance.changed });
        triggeredInstances.forEach(instance => {
            let actions = "";
            // if(instance.dockerfile)
            //     actions = "built";
            // else if(instance.dockercompose)
            //     actions = "built and deployed";

            let doWeBuild = false;
            if(instance.stackDefinitionName){
                let stackDef = _.find(stackDefinitions, stackDefinition => { return stackDefinition.name === instance.stackDefinitionName; });
                if(stackDef.dockercomposes)
                    doWeBuild = _.find(stackDef.dockercomposes,dockercompose => { return dockercompose.hasBuild }) != "undefined";
            }
            if(instance.dockercomposeName){
                let dockercompose = _.find(dockercomposes, dockercompose => { return dockercompose.name === instance.dockercomposeName; });
                doWeBuild = dockercompose.hasBuild;
            }
            instance.build = doWeBuild;
            if(doWeBuild)
                actions = `build`;
            actions = `${actions} and deployed`;

           console.log(`${instance.instanceName} has been scheduled to be ${actions}`)
        });


        //triggerInstance(triggeredInstances, stackDefinitions, dockercomposes);
    });
}

/**
 *
 * @param triggeredInstances        instanceName, path, if type==si: stackDefinitionName, if type==ssi: dockercomposeName, build,
 * @param stackDefinitions          name, path, dockercomposes
 * @param dockercomposes            name, path
 */
function triggerInstance(triggeredInstances, stackDefinitions, dockercomposes){
    console.log("****************");
    console.log("Here comes Moby");
    console.log("****************");

    //TODO

}

function deployStack(composeFile, action, stackName) {
    var shDockerStackDeploy;
    var curlDockerStackDeploy;
    if (action == "create" || action == "update") {
        shDockerStackDeploy = "docker stack deploy --compose-file " + composeFile + ' ' + stackName;
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