
var resourceUtil = require("./resourceUtil");
var stackService = require("./stackService");
var _ = require("underscore");
var configuration = require("./configuration");
var utils = require("./utils");
var imageService = require("./imageService");

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
        let dockerfiles = []; //name, path
        let stackDefinitions = [];  //name, path, dockercomposes (names)

        //populating singles
        allResourcePaths.forEach(path => {
            let typeAndResourceName = resourceUtil.getTypeAndResourceName(path);
            let name = typeAndResourceName.name;
            let type = typeAndResourceName.type;

            let single = {
                name: name,
                type: type,
                path: path
            };
            if (type == "simpleStackInstance" || type == "stackInstance") {
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
            return single.type === "stackDefinition"
        });
        stackDefinitions = _.map(stackDefinitions, stackDefinition => {
            return {name: stackDefinition.name, path: stackDefinition.path}
        });

        // console.log("***** debug singles\n",singles,"\n********");


        //populating instances
        let usedStackDefinitions = []; // List<String>
        singles.forEach(single => {
            let alreadyExisiting = instances.find(instance => {
                return instance.instanceName == single.name
            });
            if (alreadyExisiting) {
                alreadyExisiting.invalid = true;
                console.warn(`     ${single.name}: instance already exists, please remove one. Both have been marker invalid and will not be processed: ${single.path} and ${alreadyExisiting.path}`)
                utils.writeResult(single.name, {
                    warn: `${single.name}: instance already exists, please remove one. Both have been marker invalid and will not be processed: ${single.path} and ${alreadyExisiting.path}`
                });
                return;
            }
            let instance = {
                path: single.path,
                resourceName: single.name
            };
            if (single.type === "simpleStackInstance" || single.type === "stackInstance") {
                if (single.suffix)
                    instance.instanceName = single.name + '.' + single.suffix;
                else
                    instance.instanceName = single.name;
                if (single.type === "stackInstance") {
                    let stackDefinition = _.find(stackDefinitions, stackDefinition => {
                        return stackDefinition.name == single.soulMateName
                    });
                    if (!stackDefinition) {
                        console.warn(`File ${single.name} with path ${single.path} is looking for stack definition ${single.soulMateName} which is not defined`);
                        return;
                    }
                    instance.stackDefinitionName = stackDefinition.name;
                    usedStackDefinitions.push(stackDefinition.name);
                }
                if (single.type === "simpleStackInstance") {
                    let usedDockercompose = _.find(dockercomposes, dockercompose => {
                        return dockercompose.name == single.soulMateName
                    });
                    if (!usedDockercompose) {
                        console.warn(`File ${single.name} with path ${single.path} is looking for dockercompose ${single.soulMateName} which couldn't not be found, skipping`);
                        return;
                    }
                    instance.dockercomposeName = usedDockercompose.name;
                    usedDockercompose.used = true;
                }
                instances.push(instance);
            }
            if (single.type == "imageConfig") {
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
            usedStackDefinitions: usedStackDefinitions,
            dockerfiles: dockerfiles
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

    generateIntermediateComposeForSSI: function (instance, dockercomposes) {
        let dir = configuration.repoFolder + configuration.artifactDir;

        let env = this.getInstanceEnvs(instance);
        let dc = dockercomposes.find(compose => {
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

    generateIntermediateComposeForSI: function (instance, stackDefinitions, dockercomposes) {
        let dir = configuration.repoFolder + configuration.artifactDir;

        let env = this.getInstanceEnvs(instance);
        let stackDefinition = stackDefinitions.find(sd => {
            return sd.name = instance.stackDefinitionName
        });

        let skip = false;
        if (!stackDefinition.dockercomposesCmdReady) {
            let stackDefinitionConfig = utils.readFileSyncToJson(stackDefinition.path);
            stackDefinition.dockercomposesCmdReady = "";
            stackDefinition.dockercomposes = [];
            if (stackDefinitionConfig.composes && Array.isArray(stackDefinitionConfig.composes)) {
                stackDefinitionConfig.composes.forEach(composeName => {
                    let dc = dockercomposes.find(compose => {
                        return compose.name == composeName
                    });
                    if (!dc) {
                        composeName = resourceUtil.getTypeAndResourceName(composeName).name;
                        dc = dockercomposes.find(compose => {
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
     */
    triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles){

        triggeredInstances.forEach(instance => {

            if (instance.dockercomposeName) {
                let intermediateCompose = this.generateIntermediateComposeForSSI(instance, dockercomposes);
                if(intermediateCompose)
                    stackService.manageStack(instance, intermediateCompose);
            }
            if (instance.stackDefinitionName) {
                let intermediateCompose = this.generateIntermediateComposeForSI(instance, stackDefinitions, dockercomposes);
                if(intermediateCompose)
                    stackService.manageStack(instance, intermediateCompose);
            }
            if (instance.isImage){
                let dockerfilePath = _.find(dockerfiles, df => { return df.name == instance.resourceName}).path;
                imageService.manageImage(instance, dockerfilePath);
            }

        });

    },

}