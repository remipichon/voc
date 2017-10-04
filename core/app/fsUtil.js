var fs = require('fs');
var path = require('path');
var YAML = require('yamljs');
var _ = require("underscore");
var resourceUtil = require("./resourceUtil");
var configuration = require("./configuration");

module.exports = {

    getAllResourceFiles: async function () {
        console.info("Reading repository to find resource files and create couple (resource file + related config file");

        var allResourcePaths;
        try {
            allResourcePaths = await this.walkResourceFilePromise(configuration.repoFolder);
        } catch (error) {
            console.error("error", error);
            throw new Error(error)
        }
        //we are now reading all the resource file to make couple and then determine which couples need to see the counselor (Moby) according to the Git modified files

        let singles = [];       // name, type, path, if instance: soulMateName, if instance: suffix
        let instances = [];     // instanceName, path, if type==si: stackDefinitionName, if type==ssi: dockercomposeName
        let dockercomposes = [];    //name, path
        let stackDefinitions = [];  //name, path, dockercomposes (names)

        //populating singles
        allResourcePaths.forEach(path => {
            let typeAndResourceName = resourceUtil.getTypeAndResourceName(path);
            let name = typeAndResourceName.name;
            let type = typeAndResourceName.type;

            if (type == "dockerfile" || type == "imageconfig") {
                console.log("dockerfile and imageconfig are not supported yet");
            } else {
                let single = {
                    name: name,
                    type: type,
                    path: path
                };
                if (typeAndResourceName.soulMate) //only instances have soul mate
                    single.soulMateName = typeAndResourceName.soulMate;
                if (typeAndResourceName.suffix)  //only instances have soul suffix
                    single.suffix = typeAndResourceName.suffix;
                singles.push(single);
            }
        });

        dockercomposes = _.filter(singles, single => {
            return single.type === "dockercompose"
        });
        dockercomposes = _.map(dockercomposes, dockercompose => {
            return {name: dockercompose.name, path: dockercompose.path}
        });

        stackDefinitions = _.filter(singles, single => {
            return single.type === "stackDefinition"
        });
        stackDefinitions = _.map(stackDefinitions, stackDefinition => {
            return {name: stackDefinition.name, path: stackDefinition.path}
        });

        console.log("***** Here is what I could extract from the file system *****");
        console.log("singles\n", singles);
        console.log("*****                                                   *****");
        console.log("dockercomposes\n", dockercomposes);
        console.log("*****                                                   *****");
        console.log("stackDefinitions\n", stackDefinitions);
        console.log("*****           That's all from the file system         *****");


        //populating instances
        let usedStackDefinitions = []; // List<String>
        singles.forEach(single => {
            if (single.type === "simpleStackInstance" || single.type === "stackInstance") {
                let instance = {
                    instanceName: single.name,
                    path: single.path,
                };
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
        });

        console.log("***** Here are all the valid instances *****");
        console.log("instances\n", instances);


        //remove stack definitions not used by any instances
        stackDefinitions = _.filter(stackDefinitions, stackDefinition => {
            return _.contains(usedStackDefinitions, stackDefinition.name);
        });

        console.log("***** Here are all actually used stack definitions *****");
        console.log("stackDefinitions\n", stackDefinitions);

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

        console.log("***** Here are all actually used docker composes *****");
        console.log("dockercomposes\n", dockercomposes);

        //get all the contexts
        let contextPaths = [];  //  path, name
        dockercomposes.forEach(dc => {
            let dockercompose = YAML.load(dc.path);
            let path = fsUtil.removeLastPathPart(dc.path);
            if (dockercompose.services) {
                Object.keys(dockercompose.services).forEach(name => {
                    let service = dockercompose.services[name];
                    if (service.build) {
                        service.build.forEach(build => {
                            dc.hasBuild = true;
                            contextPaths.push({
                                name: dc.name,
                                directory: `${path}/${build.context}`,
                                type: "dockercompose"
                            });
                        })
                    }
                });
            }
        });

        console.log("***** Here are all the contexts used by one of the valid used docker composes *****");
        console.log(contextPaths);

        return {
            contextPaths: contextPaths,
            instances: instances,
            stackDefinitions: stackDefinitions,
            dockercomposes: dockercomposes
        };




        //get context for image
        // if(couple.dockerfile){
        //     //dockerfile: config.context (relative to current dir) or current dir
        //     let config = JSON.parse(fs.readFileSync(couple.config, {encoding: 'utf-8'}));
        //     let path = fsUtil.removeLastPathPart(config.config);
        //     if(config.context){
        //         path = `${path}/${config.context}`
        //     }
        //     path = configuration.repoFolder+path;
        //     path = path.replace("\/\/","/");//justincase
        //     contextPaths.push({name: couple.name, path: path});
        //

    },

    removeLastPathPart: function (path) {
        let dir = /^(.+)\/(.*)$/m.exec(path);
        return (dir) ? dir[1] : "/";
    },

    /**
     * thanks to https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
     */
    _walkResourceFile: function (dir, done) {
        var self = this;
        var results = [];
        fs.readdir(dir, function (err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function (file) {
                file = path.resolve(dir, file);
                fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        self._walkResourceFile(file, function (err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        if (resourceUtil.isResourceFile(file)) {
                            results.push(file);
                        }
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    },

    /**
     * @summary Recursively scan directory to find all VOC resource files
     * @param dir <String>   relative or absolute path
     * @returns {Promise}
     */
    walkResourceFilePromise: function (dir) {
        var self = this;
        return new Promise((resolve, reject) => {
            self._walkResourceFile(dir, (err, allPaths) => {
                if (err)
                    reject(err);
                else
                    resolve(allPaths);
            });
        });
    },

};