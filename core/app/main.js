'use strict';

var fsUtil = require("./fsUtil");
var gitUtil = require("./gitUtil");
var configuration = require("./configuration");
var resourceUtil = require("./resourceUtil");
var _ = require("underscore");

module.exports = {
    main:  async function () {

        console.info(`***** Reading directory to find VOC resources files: ${configuration.repoFolder} *****`);
        let allResourcePaths = await fsUtil.walkResourceFilePromise(configuration.repoFolder);
        let vocResources = fsUtil.getVocResources(allResourcePaths);
        let instances = vocResources.instances;
        let dockercomposes = vocResources.dockercomposes;
        let stackDefinitions = vocResources.stackDefinitions;
        let usedStackDefinitions = vocResources.usedStackDefinitions;
        console.log("***** Here is what I could extract from the file system *****");
        console.log("   instances\n    ", instances);
        console.log("   *****                                                   *****");
        console.log("   dockercomposes\n    ", dockercomposes);
        console.log("   *****                                                   *****");
        console.log("   stackDefinitions\n  ", stackDefinitions);
        console.log("   *****                                                   *****");
        console.log("   usedStackDefinitions\n  ", usedStackDefinitions);
        console.log("*****  That's all from the file system                   *****");


        fsUtil.cleanUnusedVocResources(stackDefinitions, usedStackDefinitions, dockercomposes);
        console.log("***** Here are all actually used stack definitions *****");
        console.log("   ", stackDefinitions);
        console.log("***** Here are all actually used docker composes *****");
        console.log("   ", dockercomposes);


        let contextPaths = fsUtil.getContextPaths(dockercomposes);
        console.log("***** Here are all the contexts used by one of the valid used docker composes *****");
        console.log("   ",contextPaths);


        console.info("***** Reading git commit payload to find which files has been modified *****");
        let files = gitUtil.getGitDiffModifiedFile();
        console.log("***** All updated files *****\n    ", files);


        let triggeredInstances = gitUtil.getUpdatedInstances(files, instances, stackDefinitions, contextPaths, dockercomposes);
        console.log("***** Summary of what is going to be effectively done according to updated files *****");
        triggeredInstances.forEach(instance => {
            let actions = "";
            //TODO
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

            console.log(`   - ${instance.instanceName} has been scheduled to be ${actions}`)
        });


        console.log("****************");
        console.log("Here comes Moby");
        console.log("****************");
        resourceUtil.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes);
    }
};