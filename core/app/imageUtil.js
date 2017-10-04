var fs = require('fs');
var _ = require("underscore");
var gitlabUtil = require("./gitlabUtil");
var configuration = require("./configuration");

module.exports = {

    manageImage(couple) {
        if (couple.clean) {
            console.log("Either Dockerfile or config file for", couple.name, "has been deleted, doint nothing, GC wil be there soon... ");
            gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, couple.name, {result: "has been unscheduled"});
            return;
        } else {
            var data;
            try {
                data = fs.readFileSync(couple.config, {encoding: 'utf-8'});
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.log("file not found for " + couple.config);
                } else {
                    console.error(`Error while reading file ${couple.config}:`, err);
                    throw err;
                }
            }

            if (data) {
                console.log('Config file for\n', couple.dockerfile, "\n", data);

                var config = JSON.parse(data);
                this.buildPushImage(couple.dockerfile, config);

            } else {
                console.info(`Action was not performed because ${configFile} was not found`);
            }
        }
    },

    pushImage(config) {
        var dockerTag = "docker tag " + config.tag + " " + config.push;
        utils.execCmd(dockerTag, function (error, stdout, stderr) {
            var dockerPush = "docker push " + config.push;
            utils.execCmd(dockerPush, function (error, stdout, stderr) {
                gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, config.push, gitlabUtil.getState(error, stderr, stdout));
            })
        })
    },

    buildPushImage(Dockerfile, config) {
        if (!config.tag) {
            console.log("Dockerfile", Dockerfile, "doesn't have a valid tag in its config");
        }

        var dockerBuild = "docker build -f " + Dockerfile + " -t " + config.tag + " . ";
        utils.execCmd(dockerBuild, function (error, stdout, stderr) {
            gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, config.tag, gitlabUtil.getState(error, stderr, stdout));

            if (config.push) this.pushImage(config);
        })
    }
};