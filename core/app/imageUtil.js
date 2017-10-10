'use strict';

var _ = require("underscore");
var gitlabUtil = require("./gitlabUtil");
var configuration = require("./configuration");

module.exports = {

    manageImage(instance, dockerfilePath) {
        if (instance.toClean) {
            console.log("Either Dockerfile or config file for", instance.name, "has been deleted, doint nothing, GC wil be there soon... ");
            utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.name, {result: "has been unscheduled"});
            return;
        }
        var config = utils.readFileSyncToJson(instance.path);
        if(this.buildImage(config, dockerfilePath) && config.push){
            this.pushImage(config);
        }
    },

    pushImage(config) {
        var dockerTag = "docker tag " + config.tag + " " + config.push;
        utils.execCmd(dockerTag, function (error, stdout, stderr) {
            var dockerPush = "docker push " + config.push;
            utils.execCmd(dockerPush, function (error, stdout, stderr) {
                utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, config.push, gitlabUtil.getState(error, stderr, stdout));
            })
        })
    },

    buildImage(config, Dockerfile) {
        if (!config.tag) {
            console.log("Dockerfile", Dockerfile, "doesn't have a valid tag in its config");
        }

        var dockerBuild = "docker build -f " + Dockerfile + " -t " + config.tag + " . ";
        let result = utils.execCmdSync(dockerBuild, true);

        if (result.error) {
            utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, config.name, {
                error: `${config.name}: An error occurred while building image from ${Dockerfile}. Image will not be pushed. Error: ${result.error} `
            });
            return false;
        }
        utils.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, instance.instanceName, {
            result: `${config.name}: Successfully built ${Dockerfile}`
        });
        return true;
    }
};