
var resourceUtil = require("./resourceUtil");
var _ = require("underscore");


module.exports = {
    /**
     * @summary extract everything from the given resource paths (without opening the files, just using the file names)
     * @param allResourcePaths List<String> list of absolute paths
     * @returns {instances: List<Instance>, dockercomposes: List<Dockercompose>, stackDefinitions: List<StackDefinition>, usedStackDefinitions: List<StackDefinition>}
     */
    /*OK*/getVocResources: function (allResourcePaths) {
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

}