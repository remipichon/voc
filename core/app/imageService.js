'use strict';

var log = require('loglevel');
var utils = require("./utils");
var gitlabUtil = require("./gitlabUtil");
var fsUtil = require("./fsUtil");
var dockerUtils = require("./dockerUtil");


module.exports = {

    manageImage(instance, dockerfilePath, dryRun = false) {

        if (instance.toClean) {
            log.info("Either Dockerfile or config file for", instance.name, "has been deleted, doint nothing, GC wil be there soon... ");
            utils.writeResult(instance.name, {result: "has been unscheduled"});
            return;
        }

        var config = utils.readFileSyncToJson(instance.path);
        if (!config.tag) {
            utils.writeResult(instance.name, {result: "Dockerfile "+ Dockerfile+ " doesn't have a valid tag in its config. Skipping process"});
            return;
        }

        if (instance.toBuild) {
            if (this.buildImage(config, dockerfilePath, dryRun) && config.push && instance.toPush)
                this.pushImage(config, dryRun);
        } else if (config.push && instance.toPush)
            this.pushImage(config, dryRun);
    },

    pushImage(config, dryRun = false) {
        var dockerTag = dockerUtils.getDockerExec() + "tag " + config.tag + " " + config.push;
        var dockerPush = dockerUtils.getDockerExec() + "push " + config.push;
        if(!dryRun)
            utils.execCmd(dockerTag, function (error, stdout, stderr) {
                utils.execCmd(dockerPush, function (error, stdout, stderr) {
                    utils.writeResult(config.push, gitlabUtil.getState(error, stderr, stdout));
                })
            });
        else
            utils.writeResult(config.push, {result: `Dry run: Docker would have run '${dockerTag}' then '${dockerPush}'`});
    },

    buildImage(config, Dockerfile, dryRun = false) {


        var dockerBuild = dockerUtils.getDockerExec() + "build -f " + Dockerfile + " -t " + config.tag + " " + fsUtil.removeLastPathPart(Dockerfile) ;
        if(dryRun) {
            utils.writeResult(config.tag, {
                result: `Dry run: Docker would have run '${dockerBuild}'`
            });
            return true;
        }

        let result = utils.execCmdSync(dockerBuild, true);

        if (result.error) {
            utils.writeResult(config.tag, {
                error: `${config.tag}: An error occurred while building image from ${Dockerfile}. Image will not be pushed. Error: ${result.error} `
            });
            return false;
        }
        utils.writeResult(config.tag, {
            result: `${config.tag}: Successfully built ${Dockerfile}`
        });
        return true;
    }
};