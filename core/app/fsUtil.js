'use strict';

var fs = require('fs');
var path = require('path');
var YAML = require('yamljs');
var _ = require("underscore");
var resourceUtil = require("./resourceUtil");
var configuration = require("./configuration");
var utils = require("./utils");
var configuration = require("./configuration");
var _ = require("underscore");

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
        let stackDefinitions = [];  //name, path, dockercomposes (names)

        //populating singles
        allResourcePaths.forEach(path => {
            let typeAndResourceName = resourceUtil.getTypeAndResourceName(path);
            let name = typeAndResourceName.name;
            let type = typeAndResourceName.type;

            if (type == "dockerfile" || type == "imageconfig") {
                //TODO support image
                console.warn("dockerfile and imageconfig are not supported yet");
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

        // console.log("***** debug singles\n",singles,"\n********");


        //populating instances
        let usedStackDefinitions = []; // List<String>
        singles.forEach(single => {
            if (single.type === "simpleStackInstance" || single.type === "stackInstance") {
                let alreadyExisiting = instances.find(instance => { return instance.instanceName == single.name});
                if(alreadyExisiting){
                    alreadyExisiting.invalid = true;
                    console.warn(`     ${single.name}: instance already exists, please remove one. Both have been marker invalid and will not be processed: ${single.path} and ${alreadyExisiting.path}`)
                    utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, single.name, {
                        warn: `${single.name}: instance already exists, please remove one. Both have been marker invalid and will not be processed: ${single.path} and ${alreadyExisiting.path}`
                    });
                    return;
                }
                let instance = {
                    path: single.path,
                    resourceName: single.name
                };
                if(single.suffix)
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
        });

        instances = _.where(instances, instance => {return !instance.invalid});

        return {
            instances: instances,
            dockercomposes: dockercomposes,
            stackDefinitions: stackDefinitions,
            usedStackDefinitions: usedStackDefinitions
        }

    },

    getContextPaths: function (dockercomposes) {
        //get all the contexts
        let contextPaths = [];  //  path, name
        dockercomposes.forEach(dc => {
            let dockercompose = YAML.load(dc.path);
            let path = this.removeLastPathPart(dc.path);
            if (dockercompose.services) {
                Object.keys(dockercompose.services).forEach(name => {
                    let service = dockercompose.services[name];
                    if (service.build && service.build.context) {
                        dc.hasBuild = true;
                        contextPaths.push({
                            name: dc.name,
                            directory: `${path}/${service.build.context}`,
                            type: "dockercompose"
                        });
                    }
                });
            }
        });

        //TODO get context for image
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


        return contextPaths;
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