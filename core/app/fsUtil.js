'use strict';

var YAML = require('yamljs');
var fs = require('fs');

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

    getContextPaths: function (dockercomposes, imageConfigs) {
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

        imageConfigs.forEach(imageConfig => {
            let config = JSON.parse(fs.readFileSync(imageConfig.path, {encoding: 'utf-8'}));
            //TODO path should be the Dockerfile, not the imageconfig  #7 "context to build image, relative from where the Dockerfile is found,"
            let path = this.removeLastPathPart(imageConfig.path);
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

    cloneAndWalkRemoteRepo: function (config, repos) {
        console.log("config",config)
        let repo;
        if (config.repo) {
            if (typeof config.repo == "string") {
                repo = _.find(repos, repo => {
                    return repo.name === repo
                });
            } else if (typeof config.repo == "object") {
                repo = config.repo
            }
        }
        if (!repo) {
            return null;
        }
        let repoconfig = utils.readFileSyncToJson(repo.path);
        let result = utils.execCmdSync(`git clone ${repoconfig.url} ${configuration.remoteRepoFolder}/${repo.name}`, true);
        if (result.error) {
            utils.writeResult(repo.name, {
                error: `${repo.name}: An error occurred while cloning ${repo.url} into ${configuration.remoteRepoFolder}. Related stacks will not be deployed. Error: ${result.error} `
            });
            return null;
        }
        utils.writeResult(repo.name, {
            result: `${repo.name}: Successfully cloned remote repo ${repo.url}`
        });
        return this.walkResourceFileSync(`${configuration.remoteRepoFolder}/${repo.name}`);
    },

    walkResourceFileSync: function (dir) {

        var self = this;
        var results = [];
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
                let res = self.walkResourceFileSync(file)
                results = results.concat(res);
                if (!--pending) return results;
            } else {
                if (resourceUtil.isResourceFile(file)) {
                    results.push(file);
                }
                if (!--pending) return results;
            }
        });
    },
}