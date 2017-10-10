'use strict';

var stackUtil = require("./stackUtil");
var _ = require("underscore");
var configuration = require("./configuration");
var utils = require("./utils");
var gitlabUtil = require("./gitlabUtil");
var imageUtil = require("./imageUtil");
//don't import fsutil (circular deps)

module.exports = {
    /**
     * Types
     *
     *
     * <Resource>
     *     * name <String>
     *     * type <String> [dockercompose|stackDefinition|simpleStackInstance|stackInstance|dockerfile|imageConfig]
     *     * [soulMate if type=simpleStackInstance or type=stackInstance]
     *     * [suffix if type=simpleStackInstance or type=stackInstance]
     *
     * <StackDefinition>
     *     * name   <String>
     *     * path   <String> absolute path
     *     * dockercomposes List<DockerCompose> ??? not in object before reading file
     *     * dockercomposesCmdReady <String>  pre-formated cmd ready ( -f xxx -f yyy) ??? not in object before reading file
     *
     *
     * <Instance>
     *     * instanceName   <String>
     *     * path           <String> absolute path
     *     * [stackDefinitionName   <String> if type=si]
     *     * [dockercomposeName     <String> if type=ssi]
     *     * toBuild           <Boolean>
     *     * toClean           <Boolean>
     *
     *
     * <DockerCompose>
     *     * name   <String>
     *     * path   <String> absolute path
     *
     */


    cleanUnusedVocResources: function (stackDefinitions, usedStackDefinitions, dockercomposes) {
        //remove stack definitions not used by any instances
        stackDefinitions = _.filter(stackDefinitions, stackDefinition => {
            return _.contains(usedStackDefinitions, stackDefinition.name);
        });


        //remove dockercomposes not used by any instances
        stackDefinitions.forEach(stackDefinition => {
            let stackDefinitionConfig = utils.readFileSyncToJson(stackDefinition.path, {encoding: 'utf-8'});
            if (stackDefinitionConfig.dockercomposes && Array.isArray(stackDefinitionConfig.dockercomposes)) {
                stackDefinitionConfig.dockercomposes.forEach(dockercomposeRelativePath => {
                    let dockercomposeName = resourceUtil.getTypeAndResourceName(dockercomposeRelativePath);
                    if (!dockercomposeName) {
                        console.warn(`Stack definition is looking for docker compose ${dockercomposeRelativePath} which is not a valid file name format, skipping`);
                    }
                    let usedDockercompose = dockercomposes.find(dockercompose => {
                        return dockercompose.name === dockercomposeName
                    });
                    if (!usedDockercompose) {
                        console.warn(`Stack definition is looking for docker compose ${dockercomposeRelativePath} which could'nt be found, skipping`);
                    }
                    usedDockercompose.used = true;
                });

                stackDefinition.dockercomposes = _.map(dockercomposes, dockercompose => {
                    return this.name;
                });
            }
        });
        dockercomposes = _.filter(dockercomposes, dockercompose => {
            return dockercompose.used
        });

    },

    /**
     * @summary Set .changed=true for all instances which are dependant on resource
     * @param resource      <Resource>
     * @param instances     List<Instance>
     * @param stackDefinitions  List<StackDefinition>
     * @param clean         <Boolean>=false
     */
    triggerInstancesForResource (resource, instances, stackDefinitions, clean = false) {
        if (resource.type === "dockercompose") {
            //all simpleStackInstance
            _.filter(instances, instance => {
                return instance.dockercomposeName == resource.name;
            }).forEach(instance => {
                instance.changed = true;
                instance.toClean = clean;
            });
            //all stackInstance whose stackDefinition contains dockercompose
            let relatedStackDefinitions = stackDefinitions.filter(stackDefinition => {
                _.contains(stackDefinition.dockercomposes, resource.name);
            });
            _.filter(instances, instance => {
                return _.contains(relatedStackDefinitions, instance.stackDefinitionName);
            }).forEach(instance => {
                instance.changed = true;
                instance.toClean = clean;
            });
        } else if (resource.type === "stackDefinition") {
            _.filter(instances, instance => {
                return instance.stackDefinitionName === resource.name;
            }).forEach(instance => {
                instance.changed = true;
                instance.toClean = clean;
            });
        } else if (resource.type === "stackInstance") {
            let si = _.find(instances, instance => {
                return instance.instanceName === resource.name;
            });
            si.changed = true;
            si.toClean = clean;
        } else if (resource.type === "simpleStackInstance") {
            let ssi = _.find(instances, instance => {
                return instance.instanceName === resource.name;
            });
            ssi.changed = true;
            ssi.toClean = clean;
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

    /**
     * @summary perform actions for each triggeredInstances
     * @param triggeredInstances        List<Instance>
     * @param stackDefinitions          List<StackDefinition>
     * @param dockercomposes            List<DockerCompose>
     */
    triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles){
        let dir = configuration.repoFolder + configuration.artifactDir;

        triggeredInstances.forEach(instance => {

            //TODO read if enabled
            //stackUtil.manageStack(instance, intermediateCompose); //TODO pass remove if

            //TODO check for same resource name and check if deploy target is different

            if (instance.dockercomposeName) {


                let env = this.getInstanceEnvs(instance);
                let dc = dockercomposes.find(compose => {
                    return compose.name == instance.dockercomposeName
                });

                let intermediateCompose = `${dir}docker-compose.intermediate.${instance.instanceName}.yml`;
                let configCmd = `${env} docker-compose -f ${dc.path} config > ${intermediateCompose}`;

                console.log(`     ${instance.instanceName}: Building intermediate compose file with cmd ${configCmd}`);
                let result = utils.execCmdSync(configCmd, true);

                if (result.error) {
                    utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
                        error: `${instance.instanceName}: An error occurred while generating intermediate compose file from ${dc}. Stack will not be deployed. Error: ${result.error} `
                    });
                    return;
                }
                utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
                    result: `${instance.instanceName}: Successfully built ${intermediateCompose}`
                });

                stackUtil.manageStack(instance, intermediateCompose); //TODO pass remove if
            }
            if (instance.stackDefinitionName) {
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
                            if(!dc){
                                composeName = this.getTypeAndResourceName(composeName).name;
                                dc = dockercomposes.find(compose => {
                                    return compose.name == composeName
                                });
                            }
                            if (!dc) {
                                utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
                                    error: `${instance.instanceName}: compose file ${composeName} doesn't seem to exist. Stack will not be deployed.`
                                });
                                skip = true;
                                return;
                            }

                            stackDefinition.dockercomposesCmdReady += ` -f ${dc.path} `;
                            stackDefinition.dockercomposes.push(dc.name);

                        })
                    } else {
                        utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
                            error: `${instance.instanceName}: Related stack definition ${stackDefinition.name} doesn't have a 'composes' array with valid docker composes names. Stack will not be deployed`
                        });
                        return;
                    }
                }
                if (skip) return;

                let composeFiles = stackDefinition.dockercomposesCmdReady;
                let intermediateCompose = `${dir}docker-compose.intermediate.${instance.instanceName}.yml`;
                let configCmd = `${env} docker-compose ${composeFiles} config > ${intermediateCompose}`;

                console.log(`     ${instance.instanceName}: Building intermediate compose file with cmd ${configCmd}`);
                let result = utils.execCmdSync(configCmd, true);

                if (result.error) {
                    utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
                        error: `${instance.instanceName}: An error occurred while generating intermediate compose file from ${composeFiles}. Stack will not be deployed. Error: ${result.error} `
                    });
                    return;
                }
                utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
                    result: `${instance.instanceName}: Successfully built ${intermediateCompose}`
                });

                stackUtil.manageStack(instance, intermediateCompose);
            }
            if (instance.image){
                let dockerfilePath = _.find(dockerfiles, df => { return df.name == instance.name}).path;
                imageUtil.manageImage(instance, dockerfilePath);
            }

        });

    },

    _isResourceFile: function (pattern, path) {
        let match = pattern.exec(path)
        if(match && match[0] != ".json") return true;
        return false;
    },

    resourceTypeRegex: {
        "dockercompose": /docker-compose\.([a-zA-Z0-9_-]+)\.yml$/m,           //docker-compose.<dc-name>.yml
        "stackDefinition": /stack-definition\.([a-zA-Z0-9_-]+)\.json$/m,       //stack-definition.<sd-name>.json
        "stackInstance": /(^stack-instance|\/stack-instance)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json$/m,  //stack-instance.<sd-name>.<si-name>[.<suffix>].json
        "simpleStackInstance": /(^simple-stack-instance|\/simple-stack-instance)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json$/m,  //stack-instance.<dc-name>.<si-name>.json
        "dockerfile": /Dockerfile\.([a-zA-Z0-9]+)$/m,
        "imageConfig": /image\.([a-zA-Z0-9]+)\.json$/m
    },

    /**
     * @summary test if path correspond to one of the resource file type
     * @param path <String> relative or absolute path or just file name
     * @returns {true|false}
     */
    isResourceFile: function (path) {
        return this.isComposeFile(path) || this.isStackDefinition(path) || this.isStackInstance(path) || this.isSimpleStackInstance(path) || this.isImageConfig(path) || this.isDockerfile(path);
    },

    isComposeFile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockercompose, fileName);
    },

    isStackDefinition: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackDefinition, fileName);
    },

    isStackInstance: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackInstance, fileName);
    },

    isSimpleStackInstance: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.simpleStackInstance, fileName);
    },

    isDockerfile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockerfile, fileName);
    },

    isImageConfig: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.imageConfig, fileName);
    },

    _getResourceName(pattern, path, matchIndex = null){
        var match = pattern.exec(path);
        // console.log("pattern",pattern, "path",path, "match",match)
        if (match) {
            if (matchIndex)
                return match[matchIndex];
            return match
        } else {
            return null;
        }
    },

    /**
     *
     * @param path <String> relative or absolute path or just file name
     * @returns <Resource>
     */
    getTypeAndResourceName(path){
        if (this.isComposeFile(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.dockercompose, path, 1),
                type: "dockercompose"
            };
        if (this.isStackDefinition(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.stackDefinition, path, 1),
                type: "stackDefinition"
            };
        if (this.isSimpleStackInstance(path)) {
            let matches = this._getResourceName(this.resourceTypeRegex.simpleStackInstance, path);
            return {
                name: matches[3],
                soulMate: matches[2],  //dockerComposeName
                suffix: (matches[4] == "json") ? null : matches[4], //couldn't make a proper regexp for that
                type: "simpleStackInstance"
            };
        }
        //isSimpleStackInstance has to be before isStackInstance because isStackInstance matches as well simpleStackInstance (regex not perfect)
        if (this.isStackInstance(path)) {
            let matches = this._getResourceName(this.resourceTypeRegex.stackInstance, path);
            return {
                name: matches[3],
                soulMate: matches[2], //stackDefinitionName
                suffix: (matches[4] == "json") ? null : matches[4], //couldn't make a proper regexp for that
                type: "stackInstance"
            };
        }
        if (this.isDockerfile(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.dockerfile, path, 1),
                type: "dockerfile"
            };
        if (this.isImageConfig(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.imageConfig, path, 1),
                type: "imageConfig"
            };
        return null;
    },

};