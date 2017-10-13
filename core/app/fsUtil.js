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
}