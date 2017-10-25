'use strict';

var _ = require("underscore");
var resourceUtil = require("./resourceUtil");
var fsUtil = require("./fsUtil");
var stackService = require("./stackService");
var imageService = require("./imageService");
var configuration = require("./configuration");
var utils = require("./utils");

module.exports = {
    /**
     * @summary extract everything from the given resource paths (without opening the files, just using the file names)
     * @param allResourcePaths List<String> list of absolute paths
     * @returns {instances: List<Instance>, dockercomposes: List<Dockercompose>, stackDefinitions: List<StackDefinition>, usedStackDefinitions: List<StackDefinition>}
     */
    getVocResources: function (allResourcePaths) {
        let singles = [];       // name, type, path, if instance: soulMateName, if instance: suffix
        let instances = [];     // instanceName, path, if type==si: stackDefinitionName, if type==ssi: dockercomposeName
        let dockercomposes = [];    //name, path
        let dockerfiles; //name, path
        let stackDefinitions = [];  //name, path, dockercomposes (names)
        let repos = [];

        //populating singles
        allResourcePaths.forEach(path => {
            let typeAndResourceName = resourceUtil.getTypeAndResourceName(path);

            let single = {
                name: typeAndResourceName.name,
                type: typeAndResourceName.type,
                path: path,
                remote: typeAndResourceName.remote || false
            };
            if (typeAndResourceName.type == "simpleStackInstance" || typeAndResourceName.type == "simpleStackInstanceRemote" || typeAndResourceName.type == "stackInstance") {
                single.soulMateName = typeAndResourceName.soulMate;
                single.suffix = typeAndResourceName.suffix;
            }
            singles.push(single);
        });


        dockercomposes = _.filter(singles, single => {
            return single.type === "dockercompose"
        });
        dockercomposes = _.map(dockercomposes, dockercompose => {
            return {name: dockercompose.name, path: dockercompose.path}
        });

        dockerfiles = _.filter(singles, single => {
            return single.type === "dockerfile"
        });
        dockerfiles = _.map(dockerfiles, dockerfiles => {
            return {name: dockerfiles.name, path: dockerfiles.path}
        });

        stackDefinitions = _.filter(singles, single => {
            return single.type === "stackDefinition" || single.type == "stackDefinitionRemote"
        });
        stackDefinitions = _.map(stackDefinitions, stackDefinition => {
            return {name: stackDefinition.name, path: stackDefinition.path, remote: stackDefinition.remote}
        });

        repos = _.filter(singles, repo => {
            return repo.type === "repo"
        });
        repos = _.map(repos, repo => {
            return {name: repo.name, path: repo.path}
        });

        console.log("***** debug singles\n",singles,"\n********");


        //populating instances
        singles.forEach(single => {

            let instance = {
                path: single.path,
                resourceName: single.name,
                remote: single.remote
            };
            if (single.type === "simpleStackInstance" || single.type === "simpleStackInstanceRemote" || single.type === "stackInstance") {
                if (single.suffix)
                    instance.instanceName = single.name + '.' + single.suffix;
                else
                    instance.instanceName = single.name;
                if (single.type === "stackInstance") {
                    //TODO put those tests in resourceUtil.cleanUnusedVocResources
                    if(!single.remote) {//soulmate is not there yet for remote, check is later
                        let stackDefinition = _.find(stackDefinitions, stackDefinition => { //we don't make distinctions between remoteRepo and others as any SI can refer to either types
                            return stackDefinition.name == single.soulMateName
                        });
                        if (!stackDefinition) {
                            console.warn(`File ${single.name} with path ${single.path} is looking for stack definition ${single.soulMateName} which is not defined`);
                            return;
                        }
                    }
                    instance.stackDefinitionName = single.soulMateName;
                }
                if (single.type === "simpleStackInstance" || single.type === "simpleStackInstanceRemote") {
                    //TODO put those tests in resourceUtil.cleanUnusedVocResources
                    if(!single.remote) {//soulmate is not there yet for remote, check is later
                        let usedDockercompose = _.find(dockercomposes, dockercompose => {
                            return dockercompose.name == single.soulMateName
                        });
                        if (!usedDockercompose) {
                            console.warn(`File ${single.name} with path ${single.path} is looking for dockercompose ${single.soulMateName} which couldn't not be found, skipping`);
                            return;
                        }
                        usedDockercompose.used = true;
                    }
                    instance.dockercomposeName = single.soulMateName;
                }
                instances.push(instance);
            }
            if (single.type == "imageConfig" || single.type == "imageConfigRemote") {
                //TODO put those tests in resourceUtil.cleanUnusedVocResources
                if(!single.remote) {//soulmate is not there yet for remote, check is later
                    if(!_.find(dockerfiles, dc => { return dc.name == single.name })){
                        console.warn(`File ${single.name} with path ${single.path} is looking for Dockerfile ${single.name} which couldn't not be found, skipping`);
                        return;
                    }
                }
                instance.isImage = true;
                instances.push(instance);
            }
        });

        instances = _.where(instances, instance => {
            return !instance.invalid
        });

        return {
            instances: instances,
            dockercomposes: dockercomposes,
            stackDefinitions: stackDefinitions,
            dockerfiles: dockerfiles,
            repos: repos
        }

    },

    getInstanceEnvs: function (instance) {
        let instanceConfig = utils.readFileSyncToJson(instance.path)
        let env = "";
        if (instanceConfig.parameters && Array.isArray(instanceConfig.parameters)) {
            instanceConfig.parameters.forEach(param => {
                env += `${ param }`
            });
        }
        return env;
    },

    generateIntermediateComposeForSSI: function (instance, dockercomposes, repos) {
        let env = this.getInstanceEnvs(instance);
        let dir = configuration.repoFolder + configuration.artifactDir;
        let searchDC;

        if(instance.remote){
            let instanceConfig = utils.readFileSyncToJson(instance.path);
            let allRemoteResourcePaths = fsUtil.cloneAndWalkRemoteRepo(instanceConfig, repos, instance.instanceName);
            if(!allRemoteResourcePaths) return null;
            let vocResourcesRemote = this.getVocResources(allRemoteResourcePaths);
            if(!vocResourcesRemote){
                utils.writeResult(instance.instanceName, {
                    error: `${instance.instanceName}: is in repo mode but 'repo' is not correctly defined. Either it doesn't 'repo' name referring a defined repo in repos.json or doesn't have a valid one shot'repo' config. Stack will not be deployed`
                });
                return null;
            }
            console.log(`   remote dockercomposes from ${instanceConfig.repo}\n    `, vocResourcesRemote.dockercomposes);
            searchDC = vocResourcesRemote.dockercomposes;
        } else {
            searchDC = dockercomposes;
        }

        let dc = searchDC.find(compose => {
            return compose.name == instance.dockercomposeName
        });

        let intermediateCompose = `${dir}docker-compose.intermediate.${instance.instanceName}.yml`;
        let configCmd = `${env} docker-compose -f ${dc.path} config > ${intermediateCompose}`;

        console.log(`     ${instance.instanceName}: Building intermediate compose file with cmd ${configCmd}`);
        let result = utils.execCmdSync(configCmd, true);

        if (result.error) {
            utils.writeResult(instance.instanceName, {
                error: `${instance.instanceName}: An error occurred while generating intermediate compose file from ${dc}. Stack will not be deployed. Error: ${result.error} `
            });
            return null;
        }
        utils.writeResult(instance.instanceName, {
            result: `${instance.instanceName}: Successfully config intermediate compose file ${intermediateCompose}`
        });
        return intermediateCompose;
    },

    generateIntermediateComposeForSI: function (instance, stackDefinitions, dockercomposes, repos) {
        let env = this.getInstanceEnvs(instance);
        let dir = configuration.repoFolder + configuration.artifactDir;
        let stackDefinition = stackDefinitions.find(sd => {
            return sd.name == instance.stackDefinitionName
        });
        console.log(`   ${instance.instanceName}: About to configure intermediate compose file from stack definition ${stackDefinition.name}`);
        let skip = false;
        if (!stackDefinition.dockercomposesCmdReady) {
            let stackDefinitionConfig = utils.readFileSyncToJson(stackDefinition.path);
            stackDefinition.dockercomposesCmdReady = "";
            stackDefinition.dockercomposes = [];
            if (stackDefinitionConfig.composes && Array.isArray(stackDefinitionConfig.composes)) {
                console.log(`   ${stackDefinition.name}: stack definition has 'composes' defined, looking for them`);
                let searchDC;
                if(stackDefinition.remote){
                    console.log(`   stack definition ${stackDefinition.name} is in remote repo mode, now cloning ${typeof stackDefinitionConfig.repo == "string"? stackDefinitionConfig.repo: stackDefinitionConfig.repo.name} to get remote dockercomposes`);
                    let allRemoteResourcePaths = fsUtil.cloneAndWalkRemoteRepo(stackDefinitionConfig, repos, instance.instanceName);
                    if(!allRemoteResourcePaths) return null;
                    let vocResourcesRemote = this.getVocResources(allRemoteResourcePaths);
                    if(!vocResourcesRemote){
                        utils.writeResult(instance.instanceName, {
                            error: `${instance.instanceName}: Related stack definition ${stackDefinition.name} is in repo mode but repo is not correctly defined. Either the stack definition doesn't have a 'repo' name referring a defined repo in repos.json or doesn't have a valid one shot'repo' config. Stack will not be deployed`
                        });
                        return null;
                    }
                    console.log(`   remote dockercomposes from remote repo ${stackDefinitionConfig.repo}\n    `, vocResourcesRemote.dockercomposes);
                    searchDC = vocResourcesRemote.dockercomposes;
                } else {
                    console.log(`   stack definition ${stackDefinition.name} is in local repo mode, using local repo to get dockercomposes`);
                    searchDC = dockercomposes;
                }
                stackDefinitionConfig.composes.forEach(composeName => {
                    let dc = searchDC.find(compose => {
                        return compose.name == composeName
                    });
                    if (!dc) {
                        composeName = resourceUtil.getTypeAndResourceName(composeName).name;
                        dc = searchDC.find(compose => {
                            return compose.name == composeName
                        });
                    }
                    if (!dc) {
                        utils.writeResult(instance.instanceName, {
                            error: `${instance.instanceName}: compose file ${composeName} doesn't seem to exist. Stack will not be deployed.`
                        });
                        skip = true;
                        return null;
                    }

                    stackDefinition.dockercomposesCmdReady += ` -f ${dc.path} `;
                    stackDefinition.dockercomposes.push(dc.name);

                })
            } else {
                utils.writeResult(instance.instanceName, {
                    error: `${instance.instanceName}: Related stack definition ${stackDefinition.name} doesn't have a 'composes' array with valid docker composes names. Stack will not be deployed`
                });
                return null;
            }
        }
        if (skip) return null;

        let composeFiles = stackDefinition.dockercomposesCmdReady;
        let intermediateCompose = `${dir}docker-compose.intermediate.${instance.instanceName}.yml`;
        let configCmd = `${env} docker-compose ${composeFiles} config > ${intermediateCompose}`;

        console.log(`     ${instance.instanceName}: Building intermediate compose file with cmd ${configCmd}`);
        let result = utils.execCmdSync(configCmd, true);

        if (result.error) {
            utils.writeResult(instance.instanceName, {
                error: `${instance.instanceName}: An error occurred while generating intermediate compose file from ${composeFiles}. Stack will not be deployed. Error: ${result.error} `
            });
            return null;
        }
        utils.writeResult(instance.instanceName, {
            result: `${instance.instanceName}: Successfully built ${intermediateCompose}`
        });
        return intermediateCompose;
    },



    /**
     * @summary perform actions for each triggeredInstances
     * @param triggeredInstances        List<Instance>
     * @param stackDefinitions          List<StackDefinition>
     * @param dockercomposes            List<DockerCompose>
     * @param repos                     List<Repo>
     */
    triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles, repos){

        //when async will be needed, it is where it should happen
        triggeredInstances.forEach(instance => {

            if (instance.dockercomposeName) {
                let intermediateCompose = this.generateIntermediateComposeForSSI(instance, dockercomposes, repos);
                if(intermediateCompose)
                    stackService.manageStack(instance, intermediateCompose);
            }
            if (instance.stackDefinitionName) {
                //clone repo and generate right dockerfile paths for stackDefintion
                let intermediateCompose = this.generateIntermediateComposeForSI(instance, stackDefinitions, dockercomposes, repos);
                if(intermediateCompose)
                    stackService.manageStack(instance, intermediateCompose);
            }
            if (instance.isImage){
                let searchDockerfiles;
                if(instance.remote){
                    let instanceConfig = utils.readFileSyncToJson(instance.path)
                    console.log(`   ${instance.resourceName}: is in remote repo mode, now cloning ${typeof instanceConfig.repo == "string"? instanceConfig.repo: instanceConfig.repo.name} to get remote dockercomposes`);
                    let allRemoteResourcePaths = fsUtil.cloneAndWalkRemoteRepo(instanceConfig, repos, instance.resourceName);
                    if(!allRemoteResourcePaths) return null;
                    let vocResourcesRemote = this.getVocResources(allRemoteResourcePaths);
                    if(!vocResourcesRemote){
                        utils.writeResult(instance.resourceName, {
                            error: `${instance.resourceName}: Image config is in repo mode but repo is not correctly defined. Either the config doesn't have a 'repo' name referring a defined repo in repos.json or doesn't have a valid one shot'repo' config. Image will not be built`
                        });
                        return null;
                    }
                    console.log(`   remote Dockerfiles from remote repo ${typeof instanceConfig.repo == "string"? instanceConfig.repo: instanceConfig.repo.name}\n    `, vocResourcesRemote.dockercomposes);
                    searchDockerfiles = vocResourcesRemote.dockerfiles

                } else {
                    searchDockerfiles = dockerfiles
                }

                let dockerfile = _.find(searchDockerfiles, df => { return df.name == instance.resourceName});
                if(!dockerfile){
                    utils.writeResult(instance.resourceName, {
                        error: `${instance.resourceName}: Dockerfile ${instance.resourceName} doesn't seem to exist ${instance.remote? "on remote repo": "on local repo"}, Image will not be built`
                    });
                    return;
                }
                let dockerfilePath = dockerfile.path;
                imageService.manageImage(instance, dockerfilePath);
            }

        });

    },

}