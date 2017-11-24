'use strict';

var log = require('loglevel');
var _ = require("underscore");
var resourceService = require("./resourceService");
var gitService = require("./gitService");
var configuration = require("./configuration");
var utils = require("./utils");
var fsUtil = require("./fsUtil");
var resourceUtil = require("./resourceUtil");


module.exports = {



    main: function () {

        log.info(`***** Reading directory to find VOC resources files: ${configuration.repoFolder} *****`);
        let allResourcePaths =  fsUtil.walkResourceFileSync(configuration.repoFolder); //for tests purposes, remove async, TODO find a clever way to combine tests and async
        log.log("DEBUG allResourcePaths",allResourcePaths);
        let vocResources = resourceService.getVocResources(allResourcePaths);
        let instances = vocResources.instances;
        let dockercomposes = vocResources.dockercomposes;
        var dockerfiles = vocResources.dockerfiles;
        let stackDefinitions = vocResources.stackDefinitions;
        let repos = vocResources.repos;

        log.log("***** Here is what I could extract from the file system *****");
        log.log("   instances\n    ", instances);
        log.log("   *****                                                   *****");
        log.log("   dockercomposes\n    ", dockercomposes);
        log.log("   *****                                                   *****");
        log.log("   stackDefinitions\n  ", stackDefinitions);
        log.log("   *****                                                   *****");
        log.log("   dockerfiles\n  ", dockerfiles);
        log.log("   *****                                                   *****");
        log.log("   repos\n  ", repos);
        log.log("*****  That's all from the file system                   *****");

        vocResources = resourceUtil.cleanUnusedVocResources(instances, stackDefinitions, dockercomposes, dockerfiles, repos);
        instances = vocResources.instances;
        dockercomposes = vocResources.dockercomposes;
        dockerfiles = vocResources.dockerfiles;
        stackDefinitions = vocResources.stackDefinitions;
        let imageConfigs = vocResources.imageConfigs;
        log.log("***** Here are all actually used stack definitions *****");
        log.log("   ", stackDefinitions);
        log.log("***** Here are all actually used docker composes *****");
        log.log("   ", dockercomposes);
        log.log("***** Here are all actually used dockerfiles NOT CLEANED *****");
        log.log("   ", dockerfiles);
        log.log("***** Here are all actually used imageConfigs  *****");
        log.log("   ", imageConfigs);


        let contextPaths = fsUtil.getContextPaths(dockercomposes, dockerfiles, imageConfigs);
        log.log("***** Here are all the contexts used by one of the valid used docker composes or one of the valid image config *****");
        log.log("   ", contextPaths);


        let triggeredInstances;
        log.info("***** Reading git commit message to get commit actions *****");
        let commitActions = gitService.getGitCommitAction();
        if (commitActions.length != 0) {
            log.info("***** Commit actions found *****");
            log.log(commitActions);
            log.info("*****  *****");
            triggeredInstances = resourceUtil.getTriggeredInstancesFromCommitActions(commitActions, imageConfigs, instances);
        } else {
            triggeredInstances = gitService.getTriggeredInstancesFromModifiedFiles(instances, stackDefinitions, contextPaths, dockercomposes, imageConfigs);
        }

        triggeredInstances = _.filter(triggeredInstances, instance => { return !instance.toDiscard});

        log.log("***** Summary of what is going to be effectively done according to updated files or commit actions *****");
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
                    actions = `${actions? actions + " and " : ""}deployed if enabled`;
            }
            log.log(`   - ${name} has been scheduled to be ${actions}`)
        });

        let dryRun = _.filter(commitActions, action => { return action.action == gitService.commitAction.dryRun}) != null;

        if(triggeredInstances.length != 0) {
            log.log("****************");
            if(dryRun)
                log.log("Dry run, Moby will not be used but Git will be if remote mode");
            else
                log.log("Here comes Moby (and Git if remote mode)");            log.log("****************");
            resourceService.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles, repos, dryRun);
        } else {
            log.log("****************");
            log.log("Nothing to do, hurray, I am taking a nap");
            log.log("****************");
            utils.writeResult("VOC", {
                result: `There was nothing to do so I did nothing.`
            });
        }
    }
};