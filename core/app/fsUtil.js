'use strict';

var fs = require('fs');
var path = require('path');
var _ = require("underscore");
var YAML = require('yamljs');
var fs = require('fs');
var configuration = require("./configuration");
var utils = require('./utils');
var resourceUtil = require("./resourceUtil");

module.exports = {
    /**
     * @summary remove file part of a path (/path/to/file => /path/to/  or /path/to/ => /path/to/ )
     * @param path
     * @returns {string}
     */
    removeLastPathPart: function (path) {
        let dir = /^(.+)\/(.*)$/m.exec(path);
        return (dir) ? dir[1] + "/" : "/";
    },

    getContextPaths: function (dockercomposes, dockerfiles, imageConfigs) {
        //get all the contexts
        let contextPaths = [];  //  path, name
        dockercomposes.forEach(dc => {
            let dockercompose = YAML.load(dc.path);
            let path = this.removeLastPathPart(dc.path);
            if (dockercompose.services) {
                Object.keys(dockercompose.services).forEach(name => {
                    let service = dockercompose.services[name];
                    if (service.build && service.build) {
                        dc.hasBuild = true;
                        contextPaths.push({
                            name: dc.name,
                            directory: `${path}${service.build.context}`,
                            type: "dockercompose"
                        });
                    }
                });
            }
        });

        _.filter(imageConfigs, ic => { return !ic.remote }).forEach(imageConfig => {
            let dockerfile = _.find(dockerfiles, dc => { return dc.name == imageConfig.resourceName});
            let config = JSON.parse(fs.readFileSync(imageConfig.path, {encoding: 'utf-8'}));
            //TODO path should be the Dockerfile, not the imageconfig  #7 "context to build image, relative from where the Dockerfile is found," => to test
            let path = this.removeLastPathPart(dockerfile.path);
            if(config.context){
                path = `${path}${config.context}`
            }
            path = path.replace("\/\/","/");//justincase
            contextPaths.push({
                name: imageConfig.resourceName,
                directory: path,
                type: 'imageConfig'
            });
        });

        return contextPaths;
    },

    cloneAndWalkRemoteRepo: function (config, repos, resourceName = "no resource name given") {
        let repoconfig;
        if (config.repo) {
            if (typeof config.repo == "string") {
                let repo = _.find(repos, repo => {
                    return repo.name === config.repo
                });
                repoconfig = utils.readFileSyncToJson(repo.path);
                repoconfig.name = config.repo;
            } else if (typeof config.repo == "object") {
                repoconfig = config.repo
            }
        }
        if (!repoconfig) {
            utils.writeResult(resourceName, {
                error: `${resourceName}: Instance's 'repo' is miss configured. Either the 'repo' string doesn't refer to a defined repos or the 'repo' object is not valid. Related stacks will not be deployed.`
            });
            return null;
        }
        let result = utils.execCmdSync(`git clone ${repoconfig.url} ${configuration.remoteRepoFolder}/${repoconfig.name}`, true);
        if (result.error) {
            if(result.error.message.indexOf("already exists and is not an empty directory") !== -1){
                let resultPull = utils.execCmdSync(`cd ${configuration.remoteRepoFolder}/${repoconfig.name}; git fetch; git checkout master; git pull`, true);
                if(resultPull.error){
                    utils.writeResult(repoconfig.name, {
                        error: `${repoconfig.name}: It seems like ${repoconfig.url} have already been cloned into ${configuration.remoteRepoFolder}. An error occured while checkout master. Error: ${resultPull.error}`
                    });
                } else
                    utils.writeResult(repoconfig.name, {
                        warning: `${repoconfig.name}: It seems like ${repoconfig.url} have already been cloned into ${configuration.remoteRepoFolder}. It has been checkout to master, let's assume we can use it`
                    });
            } else {
                utils.writeResult(repoconfig.name, {
                    error: `${repoconfig.name}: An error occurred while cloning ${repoconfig.url} into ${configuration.remoteRepoFolder}. Related stacks will not be deployed. Error: ${result.error} `
                });
                return null;
            }
        } else
            utils.writeResult(repoconfig.name, {
                result: `${repoconfig.name}: Successfully cloned remote repo ${repoconfig.url}`
            });
        return this.walkResourceFileSync(`${configuration.remoteRepoFolder}/${repoconfig.name}`);
    },

    walkResourceFileSync: function (dir) {
        var self = this;
        let results = [];
        let list;
        try {
            list = fs.readdirSync(dir);
        } catch(err) {
            return err;
        }
        var pending = list.length;
        if (!pending) return results;
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            let stat;
            try {
                stat = fs.statSync(file)
            } catch(err) {
                return err;
            }
            if (stat && stat.isDirectory()) {
                let res = self.walkResourceFileSync(file);
                results = results.concat(res);
                if (!--pending) return results;
            } else {
                if (resourceUtil.isResourceFile(file)) {
                    results.push(file);
                }
                if (!--pending) return results;
            }
        });

        return results;
    },
}