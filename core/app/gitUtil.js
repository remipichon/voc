'use strict';

var _ = require("underscore");
var resourceUtil = require("./resourceUtil");
var configuration = require("./configuration");
var utils = require("./utils");
var fsUtil = require("./fsUtil");

module.exports = {

    getUpdatedInstances: function (files, instances, stackDefinitions, contextPaths, dockercomposes) {
        files.forEach(file => {
            let fileName = file.file;

            if (resourceUtil.isResourceFile(fileName)) {
                let state = file.status;
                //Added (A), Copied (C), Deleted (D), Modified (M), Renamed (R), have their type (i.e. regular file, symlink, submodule, …​) changed (T), are Unmerged (U), are Unknown (X), or have had their pairing Broken (B).
                //state is only relevant for resource file, precisely it has to be known whether the resource should be 'cleaned' or 'used' (build, deploy, push....)
                //(A) and (M) => resource can be 'used'
                //(D) and (U) => resource can be 'cleaned'
                //I honestly never experienced (C) or (R) or (X). Renaming a file seems to produce a (D) and a (A), which is good. Copying a file just create a (A) which will not make it an happy couple and therefore will not be managed at all
                //Copying resource file without changing its name (just to another directory) will make the resource to be ignored until one of the duplicated files is deleted.
                let resource = resourceUtil.getTypeAndResourceName(fileName);
                let name = resource.name;
                if (!name) {
                    console.log(`file ${fileName} is not a valid resource file, trying as normal file`);
                } else {
                    console.log(`${fileName} is a resource file for ${name}`);
                    let clean = false;
                    if (state == "D" || state == "U") {
                        clean = true;
                    }
                    resourceUtil.triggerInstancesForResource(resource, instances, stackDefinitions, clean);
                    return;
                }
            }

            //is updated files part of resource context ?
            console.log("fileName",fileName)
            const updatedFileDirectory = utils.removeLastPathPart(fileName);
            console.log("updatedFileDirectory",updatedFileDirectory)
            let updatedContextPaths = _.filter(contextPaths, function (context) {
                return updatedFileDirectory.startsWith(context.directory);
            });
            console.log("updatedContextPaths",updatedContextPaths)

            updatedContextPaths.forEach(updatedContext => {

                //TODO updatedContext has only .name and .directory
                //todo support all types
                if (updatedContext.type == "dockercompose") {
                    let dockercompose = dockercomposes.find(dc => {
                        return dc.name === updatedContext.name
                    });
                    let resource = resourceUtil.getTypeAndResourceName(dockercompose.path);

                    if (!resource) {
                        console.warn(`resource ${updatedContext.name} doest not reference a valid resource`);
                        return;
                    }
                    resourceUtil.triggerInstancesForResource(resource, instances, stackDefinitions);
                }
            });
        });

        let triggeredInstances = _.filter(instances, function (instance) {
            return instance.changed
        });
        return triggeredInstances;
    },


    getGitDiffModifiedFile() {
        var modifiedFiles = "cd " + configuration.repoFolder + ";git diff-tree --no-commit-id --name-status -r $(git rev-parse HEAD)";

        let stdout = utils.execCmdSync(modifiedFiles);

        let allLines = stdout.split("\n") //I couldn't do it by Regexp

        let files = [];
        allLines.forEach(line => {
            var fileMatch = /^([ACDMRTUXB])\s+([^\s]+)$/m.exec(line);      //match  type    path/to/file
            if (fileMatch) {
                files.push({file: configuration.repoFolder + fileMatch[2], status: fileMatch[1]});
            }

        });

        return files;
    }

};