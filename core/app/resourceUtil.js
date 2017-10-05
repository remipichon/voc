'use strict';

var _ = require("underscore");
var configuration = require("./configuration");

module.exports = {
    /**
     * Types
     *
     *
     * <Resource>
     *     * name <String>
     *     * type [dockercompose|stackDefinition|simpleStackInstance|stackInstance|dockerfile|imageConfig]
     *     * [soulMate if type=simpleStackInstance or type=stackInstance]
     *     * [suffix if type=simpleStackInstance or type=stackInstance]
     *
     * <StackDefinition>
     *     * name   <String>
     *     * path   <String> absolute path
     *     * dockercomposes List<DockerCompose>
     *
     *
     * <Instance>
     *     * instanceName   <String>
     *     * path           <String> absolute path
     *     * [stackDefinitionName   <String> if type=si]
     *     * [dockercomposeName     <String> if type=ssi]
     *     * build          TODO ??
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
            let stackDefinitionConfig = fs.readFileSync(stackDefinition.name, {encoding: 'utf-8'});
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
    },

    /**
     * @summary perform actions for each triggeredInstances
     * @param triggeredInstances        List<Instance>
     * @param stackDefinitions          List<StackDefinition>
     * @param dockercomposes            List<DockerCompose>
     */
    triggerInstance(triggeredInstances, stackDefinitions, dockercomposes){

        //TODO

    },

    _isResourceFile: function (pattern, path) {
        return pattern.exec(path) !== null
    },

    resourceTypeRegex: {
        "dockercompose": /docker-compose\.([a-zA-Z0-9_-]+)\.yml$/m,           //docker-compose.<dc-name>.yml
        "stackDefinition": /stack-definition\.([a-zA-Z0-9_-]+)\.json$/m,       //stack-definition.<sd-name>.json
        "stackInstance": /stack-instance\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json$/m,  //stack-instance.<sd-name>.<si-name>[.<suffix>].json
        "simpleStackInstance": /simple-stack-instance\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)|\.json$/m,  //stack-instance.<dc-name>.<si-name>.json
        "dockerfile": /Dockerfile_([a-zA-Z0-9]+)$/m,
        "imageConfig": /Dockerfile_([a-zA-Z0-9]+)_config\.json$/m
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

    _getResourceName(pattern, path, matchIndex){
        var match = pattern.exec(path);
        //console.log(pattern, path,match)
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
                name: matches[2],
                soulMate: matches[1],  //dockerComposeName
                suffix: (matches[3] == "json") ? null : matches[3], //couldn't make a proper regexp for that
                type: "simpleStackInstance"
            };
        }
        //isSimpleStackInstance has to be before isStackInstance because isStackInstance matches as well simpleStackInstance (regex not perfect)
        if (this.isStackInstance(path)) {
            let matches = this._getResourceName(this.resourceTypeRegex.stackInstance, path);
            return {
                name: matches[2],
                soulMate: matches[1], //stackDefinitionName
                suffix: (matches[3] == "json") ? null : matches[3], //couldn't make a proper regexp for that
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