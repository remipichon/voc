var _ = require("underscore");
var resourceUtil = require("./resourceUtil");
var configuration = require("./configuration");

module.exports = {

    /**
     *
     * @param contextPaths          //  path, directory      (only dockercompose at the moment)
     * @param instances             // instanceName, path, if type==si: stackDefinitionName, if type==ssi: dockercomposeName
     * @param stackDefinitions      //name, path, dockercomposes
     * @param dockercomposess       //name, path
     */
    getGitDiffModifiedFile(contextPaths, instances, stackDefinitions, dockercomposes) {
        console.info("Reading git commit payload to find which files has been modified");
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

        console.log("*****************");
        console.log("All updated files\n", files);
        console.log("*****************");


        files.forEach(function (file) {
            let fileName = file.file;
            console.log("Now computing:", fileName);

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
                    gitUtil.triggerInstancesForResource(resource, instances, stackDefinitions, clean);
                    return;
                }
            }


            //is updated files part of resource context ?
            const updatedFileDirectory = fsUtil.removeLastPathPart(fileName);
            let updatedContextPaths = _.filter(contextPaths, function (context) {
                return updatedFileDirectory.startsWith(context.directory);
            });

            updatedContextPaths.forEach(updatedContext => {
                if (updatedContext.type == "dockercompose") {
                    let dockercompose = dockercomposes.find(dc => {
                        return dc.name === updatedContext.name
                    });
                    let resource = resourceUtil.getTypeAndResourceName(dockercompose.path);

                    if (!resource) {
                        console.log(`resource ${updatedContext.name} doest not reference a valid resource`);
                        return;
                    }
                    gitUtil.triggerInstancesForResource(resource, instances, stackDefinitions);
                }
            });
        });

        console.log("Summary of what is going to be effectively done according to updated files");
        let triggeredInstances = _.filter(instances, function (instance) {
            return instance.changed
        });
        triggeredInstances.forEach(instance => {
            let actions = "";
            // if(instance.dockerfile)
            //     actions = "built";
            // else if(instance.dockercompose)
            //     actions = "built and deployed";

            let doWeBuild = false;
            if (instance.stackDefinitionName) {
                let stackDef = _.find(stackDefinitions, stackDefinition => {
                    return stackDefinition.name === instance.stackDefinitionName;
                });
                if (stackDef.dockercomposes)
                    doWeBuild = _.find(stackDef.dockercomposes, dockercompose => {
                            return dockercompose.hasBuild
                        }) != "undefined";
            }
            if (instance.dockercomposeName) {
                let dockercompose = _.find(dockercomposes, dockercompose => {
                    return dockercompose.name === instance.dockercomposeName;
                });
                doWeBuild = dockercompose.hasBuild;
            }
            instance.build = doWeBuild;
            if (doWeBuild)
                actions = `build`;
            actions = `${actions} and deployed`;

            console.log(`${instance.instanceName} has been scheduled to be ${actions}`)
        });


        return triggeredInstances;
    }

};