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
            if (this.buildImage(config, dockerfilePath, dryRun) && config.push && instance.toPush) {
                if(Array.isArray(config.push)){
                  config.push.forEach(remote => {
                       this.pushImage(config.tag, remote, dryRun);
                    });
                } else
                    this.pushImage(config.tag, config.push, dryRun);
            }
        } else if (config.push && instance.toPush)
            this.pushImage(config.tag, config.push, dryRun);
    },

    pushImage(tag, pushRemote, dryRun = false) {
      var dockerTag = dockerUtils.getDockerExec() + "tag " + tag + " " + pushRemote;
        var dockerPush = dockerUtils.getDockerExec() + "push " + pushRemote;
        if(!dryRun)
            utils.execCmd(dockerTag, function (error, stdout, stderr) {
                utils.execCmd(dockerPush, function (error, stdout, stderr) {
                    utils.writeResult(tag, gitlabUtil.getState(error, stderr, stdout));
                })
            });
        else
            utils.writeResult(tag, {result: `Dry run: Docker would have run '${dockerTag}' then '${dockerPush}'`});
    },

    buildImage(config, Dockerfile, dryRun = false) {

        let containsPotentialSensitiveValue = false;
        let buildArgs = "";
        if(config.parameters) {
            config.parameters.forEach(param => {
                let value = param.value;
                if(param.value.startsWith('$')){
                    containsPotentialSensitiveValue = false;
                    value = process.env[param.value.substring(1)];
                    if(!value){
                      utils.writeResult(config.tag, {
                        warning: `value for config parameters ${param.name} refers to an env ${param.value.substring(1)} which couldn't be found. If Dockerfile has a default, it will be okay. Else, it will fail. `
                      });
                    }
                }
                if(value)
                    buildArgs += ` --build-arg ${param.name}=${value} `
            });
        }
        var dockerBuild = `${dockerUtils.getDockerExec()}build ${buildArgs} -f ${Dockerfile} -t ${config.tag} ${fsUtil.removeLastPathPart(Dockerfile)}` ;
        if(dryRun) {
            utils.writeResult(config.tag, {
                result: `Dry run: Docker would have run '${dockerBuild}'`
            });
            return true;
        }

        let result = utils.execCmdSync(dockerBuild, true, {}, { sensitiveInformation: containsPotentialSensitiveValue });

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