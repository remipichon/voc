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
        log.debug("allResourcePaths",allResourcePaths);
        let vocResources = resourceService.getVocResources(allResourcePaths);
        //use déstructuration let [ a, b, c ] = [ 6, 2, 9];
        let instances = vocResources.instances;
        let dockercomposes = vocResources.dockercomposes;
        var dockerfiles = vocResources.dockerfiles;
        let stackDefinitions = vocResources.stackDefinitions;
        let repos = vocResources.repos;

        log.info("***** Here is what I could extract from the file system *****");
        log.info("   instances\n    ", instances);
        log.info("   *****                                                   *****");
        log.info("   dockercomposes\n    ", dockercomposes);
        log.info("   *****                                                   *****");
        log.info("   stackDefinitions\n  ", stackDefinitions);
        log.info("   *****                                                   *****");
        log.info("   dockerfiles\n  ", dockerfiles);
        log.info("   *****                                                   *****");
        log.info("   repos\n  ", repos);
        log.info("*****  That's all from the file system                   *****");

        resourceService.fetchStackDefinitionsComposes(stackDefinitions, dockercomposes, repos);
        vocResources = resourceUtil.cleanUnusedVocResources(instances, stackDefinitions, dockercomposes, dockerfiles, repos);
        instances = vocResources.instances;
        dockercomposes = vocResources.dockercomposes;
        dockerfiles = vocResources.dockerfiles;
        stackDefinitions = vocResources.stackDefinitions;
        let imageConfigs = vocResources.imageConfigs;

        log.info("***** Here are all actually used stack definitions *****");
        log.info("   ", stackDefinitions);
        log.info("***** Here are all actually used docker composes *****");
        log.info("   ", dockercomposes);
        log.info("***** Here are all actually used dockerfiles NOT CLEANED *****");
        log.info("   ", dockerfiles);
        log.info("***** Here are all actually used imageConfigs  *****");
        log.info("   ", imageConfigs);


        let contextPaths = fsUtil.getContextPaths(dockercomposes, dockerfiles, imageConfigs);
        log.info("***** Here are all the contexts used by one of the valid used docker composes or one of the valid image config *****");
        log.info("   ", contextPaths);


        let triggeredInstances;
        let dryRun = false;
        log.info("***** Reading git commit message to get commit actions *****");
        let commitActions = gitService.getGitCommitAction();
        if (commitActions.length != 0) {
            log.info("***** Commit actions found *****");
            log.info(commitActions);
            log.info("*****  *****");
            dryRun = _.filter(commitActions, action => { return action.action == "dryRun"}).length != 0;
        }

        if(commitActions.length == 0 || (commitActions.length == 1 && commitActions[0].action == "dryRun")){
            log.info("***** When there is no commit actions or [dry-run] is the only commit actions, look at the git payload to get updated files")
            triggeredInstances = gitService.getTriggeredInstancesFromModifiedFiles(instances, stackDefinitions, contextPaths, dockercomposes, imageConfigs);
        } else {
            log.info("***** Using Git commit actions to trigger instances *****");
            triggeredInstances = resourceUtil.getTriggeredInstancesFromCommitActions(commitActions, imageConfigs, instances);
        }

        triggeredInstances = _.filter(triggeredInstances, instance => { return !instance.toDiscard});

        log.info("***** Summary of what is going to be effectively done according to updated files or commit actions *****");
        triggeredInstances.forEach(instance => {
            let name, actions = "";
            if (instance.toBuild)
                actions = "built ";
            if (instance.toPush)
                actions += "pushed ";
            if (!instance.isImage && instance.toDeploy)
                actions += "deployed (or removed if disabled) "; //we don't know yet the status of the stack as configuration as not been retrieved yet
            if (instance.toClean)
                actions += "cleaned ";
            if (instance.isImage)
                name = instance.resourceName;
            if (instance.dockercomposeName || instance.stackDefinitionName) {
                name = instance.instanceName;
            }
            actions = actions.slice(0, -1).replace(" "," and ");
            log.info(`   - ${name} has been scheduled to be ${actions}`)
        });

        if(triggeredInstances.length != 0) {
            log.info("****************");
            if(dryRun)
                log.info("Dry run, Moby will not be used but Git will be if remote mode");
            else
                log.info("Here comes Moby (and Git if remote mode)");            log.info("****************");
            resourceService.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles, repos, dryRun);
        } else {
            log.info("****************");
            log.info("Nothing to do, hurray, I am taking a nap");
            log.info("****************");
            utils.writeResult("VOC", {
                result: `There was nothing to do so I did nothing.`
            });
        }
    }
};
