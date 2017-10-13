'use strict';

var stackService = require("./stackService");
var _ = require("underscore");
var configuration = require("./configuration");
var utils = require("./utils");
var gitlabUtil = require("./gitlabUtil");
//don't import fsutil (circular deps)

module.exports = {
    /**
     * Types
     *
     *
     * <Resource>               everything than can be deduced from the file name only (quickly split into either SD, I, DC, DF)
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
     * <Instance>               any simpleStackInstance, stackInstance or imageConfig
     *     * [instanceName   <String> if type=si or type=ssi]
     *     * resourceName    <String> if type=si or type=ssi: =instanceName+suffix, else: =resourceName
     *     * path           <String> absolute path
     *     * [stackDefinitionName   <String> if type=si]
     *     * [dockercomposeName     <String> if type=ssi]
     *     * [isImage           <Boolean> if type=imageConfig]
     *     * toBuild           <Boolean>
     *     * toClean           <Boolean>
     *
     * <DockerCompose>
     *     * name   <String>
     *     * path   <String> absolute path
     *
     * <DockerFile>
     *     * name   <String>
     *     * path   <String> absolute path
     *
     * <ImageConfig> is same type as <Instance> without stackDefinitionName dockercomposeName but isImage=true
     *
     *
     * <ContextPath>
     *     * name       <String>
     *     * directory  <String> absolute path without filename, ending with /
     *     * type       <String> [dockercompose|imageconfig]
     *
     */


    cleanUnusedVocResources: function (stackDefinitions, usedStackDefinitions, dockercomposes, imageConfigs, dockerfiles) {
        //remove stack definitions not used by any instances
        stackDefinitions = _.filter(stackDefinitions, stackDefinition => {
            return _.contains(usedStackDefinitions, stackDefinition.name);
        });


        //remove dockercomposes not used by any instances
        stackDefinitions.forEach(stackDefinition => {
            let stackDefinitionConfig = utils.readFileSyncToJson(stackDefinition.path, {encoding: 'utf-8'});
            if (stackDefinitionConfig.dockercomposes && Array.isArray(stackDefinitionConfig.dockercomposes)) {
                stackDefinitionConfig.dockercomposes.forEach(dockercomposeRelativePath => {
                    let dockercomposeName = this.getTypeAndResourceName(dockercomposeRelativePath);
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

        //remove imageConfigs without a Dockerfile
        imageConfigs = _.filter(imageConfig => {
           return _.find(dockercomposes, dc => { dc.name == imageConfig.resourceName})
        });

    },

    getTriggeredInstancesFromCommitActions: function (commitActions, imageConfigs, instances) {
        let triggeredInstances = [];
        console.info("***** Commit actions found *****");
        console.log(commitActions);
        console.info("*****  *****");

        if (_.where(commitActions, {action: "doAll"}).length != 0) {
            console.log("build all imageconfig and build and deploy all ss and ssi")
            imageConfigs.forEach(ic => {
                ic.toBuild = true
            });
            triggeredInstances = triggeredInstances.concat(imageConfigs);

            let s_ssi = instances.filter(i => {
                return i.stackDefinitionName || i.dockercomposeName
            });
            s_ssi.forEach(i => {
                i.toBuild = true;
            });
            triggeredInstances = triggeredInstances.concat(s_ssi)
        } else {
            if (_.where(commitActions, {action: "buildAll"}).length != 0) {
                console.log("build all imageconfig");
                imageConfigs.forEach(ic => {
                    ic.toBuild = true
                });
                triggeredInstances = triggeredInstances.concat(imageConfigs);
            } else {
                if (_.where(commitActions, {action: "deployAll"}).length != 0) {
                    console.log("build and deploy all ss and ssi");
                    let s_ssi = instances.filter(i => {
                        return i.stackDefinitionName || i.dockercomposeName
                    });
                    s_ssi.forEach(i => {
                        i.toBuild = true;
                    });
                    triggeredInstances = triggeredInstances.concat(s_ssi)
                } else {
                    if (_.where(commitActions, {action: "removeAll"}).length != 0) {
                        console.log("remove all ss and ssi");
                        let s_ssi = instances.filter(i => {
                            return i.stackDefinitionName || i.dockercomposeName
                        });
                        s_ssi.forEach(i => {
                            i.toClean = true;
                        });
                        triggeredInstances = triggeredInstances.concat(s_ssi)
                    } else {
                        let actions = _.where(commitActions, {action: "buildResourceName"});
                        actions.forEach(action => {
                            console.log("build image", action.resourceName);
                            let res = instances.filter(i => {
                                return i.resourceName == action.resourceName && i.stackDefinitionName && !i.dockercomposeName
                            });
                            res.forEach(i => {
                                i.toBuild = true
                            });
                            triggeredInstances = triggeredInstances.concat(res)
                        });
                        actions = _.where(commitActions, {action: "deployInstanceName"});
                        actions.forEach(action => {
                            console.log("build and deploy", action.resourceName);
                            let res = instances.filter(i => {
                                return i.instanceName == action.resourceName
                            });
                            res.forEach(i => {
                                i.toBuild = true
                            });
                            triggeredInstances = triggeredInstances.concat(res)
                        });
                        actions = _.where(commitActions, {action: "removeInstanceName"});
                        actions.forEach(action => {
                            console.log("remove", action.resourceName);
                            let res = instances.filter(i => {
                                return i.instanceName == action.resourceName
                            });
                            res.forEach(i => {
                                i.toClean = true
                            });
                            triggeredInstances = triggeredInstances.concat(res)
                        });
                    }
                }
            }
        }
        return triggeredInstances;
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
        } else if (resource.type == "imageConfig"){
            let imageConfig = _.find(instances, instance => {
                return instance.resourceName === resource.name;
            });
            imageConfig.changed = true;
            imageConfig.toClean = clean;
        } else if (resource.type == "dockerfile"){ //resource type dockerfile and imageConfig have the same 'name' but are not stored in the same arrays (dockerfile is never an Instance)
            //something to do ?
            let imageConfig = _.find(instances, instance => {
                return instance.resourceName === resource.name;
            });
            imageConfig.changed = true;
            imageConfig.toClean = clean;
        }
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