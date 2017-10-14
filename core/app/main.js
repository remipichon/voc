'use strict';

var _ = require("underscore");
var fsService = require("./fsService");
var resourceService = require("./resourceService");
var gitService = require("./gitService");
var configuration = require("./configuration");
var fsUtil = require("./fsUtil");
var resourceUtil = require("./resourceUtil");


module.exports = {



    main: async function () {

        console.info(`***** Reading directory to find VOC resources files: ${configuration.repoFolder} *****`);
        let allResourcePaths = await fsService.walkResourceFilePromise(configuration.repoFolder);
        let vocResources = resourceService.getVocResources(allResourcePaths);
        let instances = vocResources.instances;
        let dockercomposes = vocResources.dockercomposes;
        var dockerfiles = vocResources.dockerfiles;
        let stackDefinitions = vocResources.stackDefinitions;
        let usedStackDefinitions = vocResources.usedStackDefinitions;
        let imageConfigs = _.filter(instances, instance => {
            return instance.isImage
        });
        console.log("***** Here is what I could extract from the file system *****");
        console.log("   instances\n    ", instances);
        console.log("   *****                                                   *****");
        console.log("   dockercomposes\n    ", dockercomposes);
        console.log("   *****                                                   *****");
        console.log("   stackDefinitions\n  ", stackDefinitions);
        console.log("   *****                                                   *****");
        console.log("   dockerfiles\n  ", dockerfiles);
        console.log("   *****                                                   *****");
        console.log("   usedStackDefinitions\n  ", usedStackDefinitions);
        console.log("   *****                                                   *****");
        console.log("   imageConfigs\n  ", imageConfigs);
        console.log("*****  That's all from the file system                   *****");


        resourceUtil.cleanUnusedVocResources(stackDefinitions, usedStackDefinitions, dockercomposes, imageConfigs, dockerfiles);
        console.log("***** Here are all actually used stack definitions *****");
        console.log("   ", stackDefinitions);
        console.log("***** Here are all actually used docker composes *****");
        console.log("   ", dockercomposes);
        console.log("***** Here are all actually used dockerfiles NOT CLEANED *****");
        console.log("   ", dockerfiles);
        console.log("***** Here are all actually used imageConfigs  *****");
        console.log("   ", imageConfigs);


        let contextPaths = fsUtil.getContextPaths(dockercomposes, imageConfigs);
        console.log("***** Here are all the contexts used by one of the valid used docker composes or one of the valid image config *****");
        console.log("   ", contextPaths);


        let triggeredInstances;
        console.info("***** Reading git commit message to get commit actions *****");
        let commitActions = gitService.getGitCommitAction();
        if (commitActions.length != 0) {
            triggeredInstances = resourceUtil.getTriggeredInstancesFromCommitActions(commitActions, imageConfigs, instances);
        } else {
            triggeredInstances = gitService.getTriggeredInstancesFromModifiedFiles(instances, stackDefinitions, contextPaths, dockercomposes);
        }

        console.log("***** Summary of what is going to be effectively done according to updated files or commit actions *****");
        triggeredInstances.forEach(instance => {
            let name, actions;
            if (instance.toBuild)
                actions = "build";
            if (instance.toClean)
                actions = "cleaned";
            if (instance.isImage) {
                name = instance.resourceName
            }
            if (instance.dockercomposeName || instance.stackDefinitionName) {
                name = instance.instanceName;
                if (!instance.toClean)
                    actions = `${actions} and deployed if enabled`;
            }
            console.log(`   - ${name} has been scheduled to be ${actions}`)
        });


        console.log("****************");
        console.log("Here comes Moby");
        console.log("****************");
        resourceService.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles);
    }
};