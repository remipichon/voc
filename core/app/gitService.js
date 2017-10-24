'use strict';

var _ = require("underscore");
var configuration = require("./configuration");
var resourceUtil = require("./resourceUtil");
var utils = require("./utils");
var fsUtil = require("./fsUtil");

module.exports = {

    getTriggeredInstancesFromModifiedFiles: function (instances, stackDefinitions, contextPaths, dockercomposes) {
        console.info("***** Reading git commit payload to find which files has been modified *****");
        let files = this.getGitDiffModifiedFile();
        console.log("***** All updated files *****\n    ", files);
        let triggeredInstances = this.getUpdatedInstances(files, instances, stackDefinitions, contextPaths, dockercomposes);

        triggeredInstances.forEach(instance => {
            let actions = "";
            let doWeBuild = false;
            if (instance.image)
                doWeBuild = true;

            if (instance.stackDefinitionName) {
                let stackDef = _.find(stackDefinitions, stackDefinition => {
                    return stackDefinition.name === instance.stackDefinitionName;
                });
                if(stackDef.remote){
                    console.info(`Instance ${instance.resourceName} is using a stack definition ${stackDef.name} which is in remote repo mode. Instance is flagged as 'build'. Indeed, we don't know yet if any of stack defintion docker composes has build dependencies.`);
                    doWeBuild = true;
                } else
                    if (stackDef.dockercomposes)
                        doWeBuild = _.find(stackDef.dockercomposes, dockercompose => {
                                return dockercompose.hasBuild
                            }) != "undefined";
            }
            if (instance.dockercomposeName) {
                if(instance.remote){
                    console.info(`Instance ${instance.resourceName} is in remote mode and is using a docker compose ${instance.dockercomposeName}. Instance is flagged as 'build'. Indeed, we don't know yet if the docker composes has build dependencies.`);
                    doWeBuild = true;
                } else {
                    let dockercompose = _.find(dockercomposes, dockercompose => {
                        return dockercompose.name === instance.dockercomposeName;
                    });
                    if (!dockercompose) {
                        instance.toDiscard = true;
                        utils.writeResult(instance.instanceName, {
                            warning: `${instance.instanceName}: is refering to docker compose ${instance.dockercomposeName} which doesnt exist. Instance will be discarded`
                        });
                    } else {
                        doWeBuild = dockercompose.hasBuild;
                    }
                }
            }
            instance.toBuild = doWeBuild;
        });
        return triggeredInstances;
    },

    /*OK to go in any service*/getUpdatedInstances: function (files, instances, stackDefinitions, contextPaths, dockercomposes, imageConfigs) {
        files.forEach(file => {
            let fileName = file.file;

            if (resourceUtil.isResourceFile(fileName)) {
                let state = file.status;
                //Added (A), Copied (C), Deleted (D), Modified (M), Renamed (R), have their type (i.e. regular file, symlink, submodule, …​) changed (T), are Unmerged (U), are Unknown (X), or have had their pairing Broken (B).
                //state is only relevant for resource file, precisely it has to be known whether the resource should be 'cleaned' or 'used' (build, deploy, push....)
                //(A) and (M) => resource can be 'used'
                //(D) and (U) => resource can be 'cleaned'
                //I honestly never experienced (C) or (R) or (X). Renaming a file seems to produce a (D) and a (A), which is good. Copying a file just create a (A) which will not make it an happy couple and therefore will not be managed at all
                //Copying resource file without changing its name (just to another directory) will make the resource to be ignored until one of the duplicated files is deleted.
                let resource = resourceUtil.getTypeAndResourceName(fileName);
                let name = resource.name;
                if (!name) {
                    console.log(`file ${fileName} is not a valid resource file, trying as normal file`);
                } else {
                    console.log(`${fileName} is a resource file for ${name}`);
                    let clean = false;
                    if (state == "D" || state == "U") {
                        clean = true;
                    }
                    resourceUtil.triggerInstancesForResource(resource, instances, stackDefinitions, clean);
                    return;
                }
            }

            //is updated files part of resource context ?
            console.log("fileName",fileName)
            const updatedFileDirectory = fsUtil.removeLastPathPart(fileName);
            console.log("updatedFileDirectory",updatedFileDirectory)
            let updatedContextPaths = _.filter(contextPaths, function (context) {
                return updatedFileDirectory.startsWith(context.directory);
            });
            console.log("updatedContextPaths",updatedContextPaths)

            //on remote mode, only resource files can be found on local VOC repo
            updatedContextPaths.forEach(updatedContext => {
                if (updatedContext.type == "dockercompose") {
                    let dockercompose = dockercomposes.find(dc => {
                        return dc.name === updatedContext.name
                    });
                    let resource = resourceUtil.getTypeAndResourceName(dockercompose.path);

                    if (!resource) {
                        console.warn(`resource ${updatedContext.name} doest not reference a valid resource`);
                        return;
                    }
                    resourceUtil.triggerInstancesForResource(resource, instances, stackDefinitions);
                } else if(updatedContext.type == "imageConfig"){
                    let imageConfig = imageConfigs.find(ic => {
                        return ic.resourceName === updatedContext.name
                    });
                    let resource = resourceUtil.getTypeAndResourceName(imageConfig.path);
                    if (!resource) {
                        console.warn(`resource ${updatedContext.name} doest not reference a valid resource`);
                        return;
                    }
                    resourceUtil.triggerInstancesForResource(resource, instances, stackDefinitions);
                }
            });
        });

        let triggeredInstances = _.filter(instances, function (instance) {
            return instance.changed
        });
        return triggeredInstances;
    },


    commitAction: {
        buildAll: /(\[build\-all\])/m,
        deployAll: /(\[deploy\-all\])/m,
        doAll: /(\[do\-all\])/m,
        removeAll: /(\[remove\-all\])/m,
        buildDeployAll: /(\[build\-deploy\-all\])/m,
        buildResourceName: /(\[build\-([a-zA-Z0-9]+)\])/m,
        deployInstanceName: /(\[deploy\-([a-zA-Z0-9]+)\])/m,
        removeInstanceName: /(\[remove\-([a-zA-Z0-9]+)\])/m
    },

    getGitCommitAction(){
        let stdout = utils.execCmdSync("cd " + configuration.repoFolder + "; git log -1 --pretty=%B");
        let actions = [];
        Object.keys(this.commitAction).forEach(action => {
            let match = this.commitAction[action].exec(stdout);
            if(match){
                let res = {action: action};
                if(match[2])
                    res.resourceName = match[2];
                actions.push(res);
            }
        });
        return actions;
    },


    getGitDiffModifiedFile() {
        var modifiedFiles = "cd " + configuration.repoFolder + ";git diff-tree --no-commit-id --name-status -r $(git rev-parse HEAD)";

        let stdout = utils.execCmdSync(modifiedFiles);

        let allLines = stdout.split("\n") //I couldn't do it by Regexp

        let files = [];
        allLines.forEach(line => {
            var fileMatch = /^([ACDMRTUXB])\s+([^\s]+)$/m.exec(line);      //match  type    path/to/file
            if (fileMatch) {
                files.push({file: configuration.repoFolder + fileMatch[2], status: fileMatch[1]});
            }

        });

        return files;
    }

};