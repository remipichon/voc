'use strict';

var log = require('loglevel');
var _ = require("underscore");
var utils = require("./utils");

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
     *     * [remoteRepo: <Boolean>]
     *
     * <Instance>               any simpleStackInstance, stackInstance or imageConfig
     *     * [instanceName   <String> if type=si or type=ssi]
     *     * resourceName    <String> if type=si or type=ssi: =instanceName+suffix, else: =resourceName
     *     * path           <String> absolute path
     *     * remote         <Boolean> is local or remote ([docker-code-remote-mode] supported only)
     *     * [stackDefinitionName   <String> if type=si]
     *     * [dockercomposeName     <String> if type=ssi]
     *     * [isImage           <Boolean> if type=imageConfig]
     *     * toBuild           <Boolean>
     *     * toClean           <Boolean>
     *     * [repo             <Repo> or <String> if type=si or if type=imageConfig]
     *
     *     imageConfig.resourceName correspond to dockercompose.name, one can be used to find its soulmate
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
     *
     * <Repo>
     *     * name
     *     * url
     *
     */


    cleanUnusedVocResources: function (instances, stackDefinitions, dockercomposes, dockerfiles, repos) {
        // //TODO remove stack definitions not used by any instances (no diff between remote and local)
        // let usedStackDefinitionNames = _.filter(instances  get all stackDef whose name is found in instances
        // stackDefinitions = _.filter(stackDefinitions, stackDefinition => {
        //     return _.contains(usedStackDefinitionNames, stackDefinition.name);
        // });

        //remove duplicate resourceName
        let duplicates = _.groupBy(instances, i => { return i.resourceName});
        _.forEach(duplicates, (duplicate, resourceName) => {
            if(duplicate.length !== 1){
                let allPaths = "";
                _.forEach(duplicate, instance => {
                    instance.toDiscard = true;
                    allPaths += instance.path + "  |  "
                });
                utils.writeResult(resourceName, {
                    warn: `${resourceName}: more than one instance have been found. All of them will be discarded: ${allPaths}`
                });
            }
        });
        instances = _.filter(instances, i => { return !i.toDiscard});

        //remove dockercomposes not used by any instances
        stackDefinitions.forEach(stackDefinition => {
            if(stackDefinition.remoteRepo){
                log.info(`Stack definition ${stackDefinition.name} is in remote repo mode, its docker composes dependencies will be verified just before docker compose config time`);
                return;
            }
            let stackDefinitionConfig = utils.readFileSyncToJson(stackDefinition.path, {encoding: 'utf-8'});
            if (stackDefinitionConfig.dockercomposes && Array.isArray(stackDefinitionConfig.dockercomposes)) {
                stackDefinitionConfig.dockercomposes.forEach(dockercomposeRelativePath => {
                    let dockercomposeName = this.getTypeAndResourceName(dockercomposeRelativePath).name;
                    if (!dockercomposeName) {
                        log.warn(`Stack definition ${stackDefinition.name} is looking for docker compose ${dockercomposeRelativePath} which is not a valid file name format. Stack def`);
                        return;
                    }
                    let usedDockercompose = dockercomposes.find(dockercompose => {
                        return dockercompose.name === dockercomposeName
                    });
                    if (!usedDockercompose) {
                        log.warn(`Stack definition ${stackDefinition.name} is looking for docker compose ${dockercomposeRelativePath} which could'nt be found, skipping`);
                        return;
                    }
                    usedDockercompose.used = true;
                });

                stackDefinition.dockercomposes = _.map(dockercomposes, dockercompose => {
                    return this.name;
                });
            }
        });

        // dockercomposes = _.filter(dockercomposes, dockercompose => {
        //     return dockercompose.used;
        // });

        //remove imageConfigs without a Dockerfile
        let imageConfigs = _.filter(instances, imageConfig => {
            return imageConfig.isImage &&
                (imageConfig.remote &&
                    ((imageConfig.repo && _.find(repos, repo => { return repo.name === imageConfig.repo }) ) || true )
                    || _.find(dockerfiles, df => { return df.name == imageConfig.resourceName}))
        });

        return {
            instances: instances,
            dockercomposes: dockercomposes,
            stackDefinitions: stackDefinitions,
            dockerfiles: dockerfiles,
            imageConfigs: imageConfigs
        }

    },

    getTriggeredInstancesFromCommitActions: function (commitActions, imageConfigs, instances) {
        let triggeredInstances = [];

        if (_.where(commitActions, {action: "doAll"}).length != 0 || _.where(commitActions, {action: "buildDeployAll"}).length != 0) {
            log.debug("Trigger instance via commit action: build push all images and build deploy all ss and ssi")
            imageConfigs.forEach(ic => {
                ic.toBuild = true;
                ic.toPush = true;
            });
            triggeredInstances = triggeredInstances.concat(imageConfigs);

            let s_ssi = instances.filter(i => {
                return i.stackDefinitionName || i.dockercomposeName
            });
            s_ssi.forEach(i => {
                i.toBuild = true;
                i.toDeploy = true;
            });
            triggeredInstances = triggeredInstances.concat(s_ssi)
        } else {
            if (_.where(commitActions, {action: "buildAll"}).length != 0) {
                log.debug("Trigger instance via commit action: build all images, SI and SSI");
                imageConfigs.forEach(ic => {
                    ic.toBuild = true
                    ic.toPush = false;
                });
                triggeredInstances = triggeredInstances.concat(imageConfigs);
                let s_ssi = instances.filter(i => {
                    return i.stackDefinitionName || i.dockercomposeName
                });
                s_ssi.forEach(i => {
                    i.toBuild = true;
                    i.toDeploy = false;
                });
                triggeredInstances = triggeredInstances.concat(s_ssi)
            } else {
                if (_.where(commitActions, {action: "deployAll"}).length != 0) {
                    log.debug("Trigger instance via commit action: push all images and deploy all ss and ssi");
                    imageConfigs.forEach(ic => {
                        ic.toBuild = false;
                        ic.toPush = true;
                    });
                    let s_ssi = instances.filter(i => {
                        return i.stackDefinitionName || i.dockercomposeName
                    });
                    s_ssi.forEach(i => {
                        i.toBuild = false;
                        i.toDeploy = true;
                    });
                    triggeredInstances = triggeredInstances.concat(imageConfigs);
                    triggeredInstances = triggeredInstances.concat(s_ssi)
                } else {
                    if (_.where(commitActions, {action: "removeAll"}).length != 0) {
                        log.debug("Trigger instance via commit action: remove all images and ss and ssi");
                        imageConfigs.forEach(ic => {
                            ic.toClean = false;
                        });
                        let s_ssi = instances.filter(i => {
                            return i.stackDefinitionName || i.dockercomposeName
                        });
                        s_ssi.forEach(i => {
                            i.toClean = true;
                        });
                        triggeredInstances = triggeredInstances.concat(imageConfigs);
                        triggeredInstances = triggeredInstances.concat(s_ssi)
                    } else {
                        let actions = _.where(commitActions, {action: "buildResourceName"});
                        actions.forEach(action => {
                            log.debug("Trigger instance via commit action: build image or SI or SSI", action.resourceName);
                            let res = instances.filter(i => {
                                return i.resourceName == action.resourceName;
                            });
                            res.forEach(i => {
                                i.toBuild = true;
                                i.toDeploy = false;
                                i.toPush = false;
                            });
                            triggeredInstances = triggeredInstances.concat(res)
                        });
                        actions = _.where(commitActions, {action: "deployInstanceName"});
                        actions.forEach(action => {
                            log.debug("Trigger instance via commit action: push image or deploy SI or SSI", action.resourceName);
                            let res = instances.filter(i => {
                                return i.instanceName == action.resourceName
                            });
                            res.forEach(i => {
                                i.toBuild = false;
                                i.toDeploy = true;
                                i.toPush = true;
                            });
                            triggeredInstances = triggeredInstances.concat(res)
                        });
                        actions = _.where(commitActions, {action: "removeInstanceName"});
                        actions.forEach(action => {
                            log.debug("Trigger instance via commit action: remove", action.resourceName);
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
        //support repo updated
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
                return _.contains(stackDefinition.dockercomposes, resource.name);
            });
            _.filter(instances, instance => {
                return _.contains(relatedStackDefinitions, instance.stackDefinitionName);
            }).forEach(instance => {
                instance.changed = true;
                instance.toClean = clean;
            });
        } else if (resource.type === "stackDefinition" || resource.type === "stackDefinitionRemote") {
            _.filter(instances, instance => {
                return instance.stackDefinitionName === resource.name;
            }).forEach(instance => {
                instance.changed = true;
                instance.toClean = clean;
            });
        } else if (resource.type === "stackInstance" || resource.type === "simpleStackInstance" || resource.type === "simpleStackInstanceRemote") {
            let si = _.find(instances, instance => {
                return instance.instanceName === resource.name;
            });
            si.changed = true;
            si.toClean = clean;
        } else if (resource.type == "imageConfig" || resource.type == "imageConfigRemote"){
            let imageConfig = _.find(instances, instance => {
                return instance.resourceName === resource.name;
            });
            imageConfig.changed = true;
            imageConfig.toClean = clean;
        } else if (resource.type == "dockerfile"){ //resource type dockerfile and imageConfig have the same 'name' but are not stored in the same arrays (dockerfile is never an Instance)
            //nothing to do to support remote image config (a Docker related files cannot be a remote, it's either local or not existing in the dockerfiles list)
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
        "simpleStackInstance": /(^simple-stack-instance|\/simple-stack-instance)(?!\.remote-repo)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json$/m,  //simple-stack-instance.<dc-name>.<si-name>.json
        "dockerfile": /Dockerfile\.([a-zA-Z0-9_-]+)$/m,
        "imageConfig": /image\.([a-zA-Z0-9_-]+)\.json$/m,
        "imageConfigRemote": /image\.remote-repo\.(.+)\.json$/m,            //image.remote-repo.<Docker.file-name>.json
        "simpleStackInstanceRemote": /(^simple-stack-instance|\/simple-stack-instance)\.remote-repo\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json/m,    //simple-stack-instance.remote-repo.<d.c-name>.<si-name>.json
        "stackDefinitionRemote": /stack-definition\.remote-repo\.(.+)\.json$/m,  //stack-definition.remote-repo.<s.d-name>.json
        "repos": /repo\.([a-zA-Z0-9_-]+).json$/m
    },

    /**
     * @summary test if path correspond to one of the resource file type
     * @param path <String> relative or absolute path or just file name
     * @returns {true|false}
     */
    isResourceFile: function (path) {
        return this.isComposeFile(path)
            || this.isStackDefinition(path) || this.isStackDefinitionRemote(path)
            || this.isStackInstance(path) || this.isSimpleStackInstance(path) || this.isSimpleStackInstanceRemote(path)
            || this.isImageConfig(path) ||  this.isImageConfigRemote(path)|| this.isDockerfile(path)
            || this.isRepo(path);
    },

    isComposeFile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockercompose, fileName);
    },

    isStackDefinition: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackDefinition, fileName);
    },

    isStackDefinitionRemote: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackDefinitionRemote, fileName);
    },

    isStackInstance: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.stackInstance, fileName);
    },

    isSimpleStackInstance: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.simpleStackInstance, fileName);
    },

    isSimpleStackInstanceRemote: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.simpleStackInstanceRemote, fileName);
    },

    isDockerfile: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.dockerfile, fileName);
    },

    isImageConfig: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.imageConfig, fileName);
    },

    isImageConfigRemote: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.imageConfigRemote, fileName);
    },

    isRepo: function (fileName) {
        return this._isResourceFile(this.resourceTypeRegex.repos, fileName);
    },

    _getResourceName(pattern, path, matchIndex = null){
        var match = pattern.exec(path);
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
        if (this.isStackDefinitionRemote(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.stackDefinitionRemote, path, 1),
                type: "stackDefinitionRemote",
                remote: true
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
        if (this.isSimpleStackInstanceRemote(path)) {
            let matches = this._getResourceName(this.resourceTypeRegex.simpleStackInstanceRemote, path);
            return {
                name: matches[3],
                soulMate: matches[2],  //dockerComposeName
                suffix: (matches[4] == "json") ? null : matches[4], //couldn't make a proper regexp for that
                type: "simpleStackInstanceRemote",
                remote: true
            };
        }
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
        if (this.isImageConfigRemote(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.imageConfigRemote, path, 1),
                type: "imageConfigRemote",
                remote: true
            };
        if (this.isRepo(path))
            return {
                name: this._getResourceName(this.resourceTypeRegex.repos, path, 1),
                type: "repo",
            };
        return null;
    },

};