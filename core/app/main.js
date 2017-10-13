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
        var dockerfiles = vocResources.dockerfiles;
        let stackDefinitions = vocResources.stackDefinitions;
        let usedStackDefinitions = vocResources.usedStackDefinitions;
        let imageConfigs = _.filter(instances, instance => { return instance.isImage});
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


        resourceUtil.cleanUnusedVocResources(stackDefinitions, usedStackDefinitions, dockercomposes);
        console.log("***** Here are all actually used stack definitions *****");
        console.log("   ", stackDefinitions);
        console.log("***** Here are all actually used docker composes *****");
        console.log("   ", dockercomposes);
        console.log("***** Here are all actually used dockerfiles *****");
        console.log("   ", dockerfiles);
        //TODO clean imageConfig
        console.log("***** Here are all actually used imageConfigs NOT CLEANED *****");
        console.log("   ", imageConfigs);


        let contextPaths = fsUtil.getContextPaths(dockercomposes, imageConfigs);
        console.log("***** Here are all the contexts used by one of the valid used docker composes or one of the valid image config *****");
        console.log("   ",contextPaths);


        let triggeredInstances = [];
        console.info("***** Reading git commit message to get commit actions *****");
        //TODO make a method
        let commitActions = gitUtil.getGitCommitAction();
        if(commitActions.length != 0){
            console.info("***** Commit actions found *****");
            console.log(commitActions);
            console.info("*****  *****");

            if (_.where(commitActions, {action: "doAll"}).length != 0) {
                console.log("build all imageconfig and build and deploy all ss and ssi")
                imageConfigs.forEach(ic => {
                    ic.toBuild = true
                });
                triggeredInstances = triggeredInstances.concat(imageConfigs);

                let s_ssi = instances.filter(i => {
                    return i.stackDefinitionName || i.dockercomposeName
                });
                s_ssi.forEach(i => { i.toBuild = true;});
                triggeredInstances = triggeredInstances.concat(s_ssi)
            } else {
                if (_.where(commitActions, {action: "buildAll"}).length != 0) {
                    console.log("build all imageconfig");
                    imageConfigs.forEach(ic => {
                        ic.toBuild = true
                    });
                    triggeredInstances = triggeredInstances.concat(imageConfigs);
                } else {
                    if (_.where(commitActions, {action: "deployAll"}).length != 0) {
                        console.log("build and deploy all ss and ssi");
                        let s_ssi = instances.filter(i => {
                            return i.stackDefinitionName || i.dockercomposeName
                        });
                        s_ssi.forEach(i => { i.toBuild = true;});
                        triggeredInstances = triggeredInstances.concat(s_ssi)
                    } else {
                        if (_.where(commitActions, {action: "removeAll"}).length != 0) {
                            console.log("remove all ss and ssi");
                            let s_ssi = instances.filter(i => {
                                return i.stackDefinitionName || i.dockercomposeName
                            });
                            s_ssi.forEach(i => { i.toClean = true;});
                            triggeredInstances = triggeredInstances.concat(s_ssi)
                        } else {
                            let actions = _.where(commitActions, {action: "buildResourceName"});
                            actions.forEach(action => {
                                console.log("build image", action.resourceName);
                                let res = instances.filter(i => { return i.resourceName == action.resourceName && i.stackDefinitionName  && !i.dockercomposeName});
                                res.forEach(i => { i.toBuild = true});
                                triggeredInstances = triggeredInstances.concat(res)
                            });
                            actions = _.where(commitActions, {action: "deployInstanceName"});
                            actions.forEach(action => {
                                console.log("build and deploy", action.resourceName);
                                let res = instances.filter(i => { return i.instanceName == action.resourceName });
                                res.forEach(i => { i.toBuild = true});
                                triggeredInstances = triggeredInstances.concat(res)
                            });
                            actions = _.where(commitActions, {action: "removeInstanceName"});
                            actions.forEach(action => {
                                console.log("remove", action.resourceName);
                                let res = instances.filter(i => { return i.instanceName == action.resourceName });
                                res.forEach(i => { i.toClean = true});
                                triggeredInstances = triggeredInstances.concat(res)
                            });
                        }
                    }
                }
            }
        } else {
            console.info("***** Reading git commit payload to find which files has been modified *****");
            let files = gitUtil.getGitDiffModifiedFile();
            console.log("***** All updated files *****\n    ", files);
            triggeredInstances = gitUtil.getUpdatedInstances(files, instances, stackDefinitions, contextPaths, dockercomposes);

            triggeredInstances.forEach(instance => {
                let actions = "";
                let doWeBuild = false;
                if(instance.image)
                    doWeBuild = true;

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
                instance.toBuild = doWeBuild;
            });
        }

        console.log("***** Summary of what is going to be effectively done according to updated files or commit actions *****");
        triggeredInstances.forEach(instance => {
            let name, actions;
            if (instance.toBuild)
                actions = "build";
            if(instance.toClean)
                actions = "cleaned";
            if(instance.isImage) {
                name = instance.resourceName
            } if(instance.dockercomposeName || instance.stackDefinitionName){
                name = instance.instanceName;
                if(!instance.toClean)
                    actions = `${actions} and deployed`;
            }
            console.log(`   - ${name} has been scheduled to be ${actions}`)
        });



        console.log("****************");
        console.log("Here comes Moby");
        console.log("****************");
        resourceUtil.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes, dockerfiles);
    }
};