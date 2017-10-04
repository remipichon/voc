var fs = require('fs');
var _ = require("underscore");
var gitlabUtil = require("./gitlabUtil");
var configuration = require("./configuration");

module.exports = {

    manageStack(couple) {
        if (couple.clean) {
            console.log("Either docker-compose or config file for", couple.name, "has been deleted, remove associated stack");
            deployStack(couple.dockercompose, "remove", couple.name);
        } else {
            var data;
            try {
                data = fs.readFileSync(couple.config, {encoding: 'utf-8'});
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.log("Config json file not found for " + couple.dockercompose);
                } else {
                    console.error("Error while reading config json file:", err);
                    throw err;
                }
            }

            if (data) {
                console.log('Config for\n', couple.dockercompose, "\n", data);

                var config = JSON.parse(data);
                var action;

                if (config.enabled) {
                    action = "update"
                } else {
                    action = "remove"
                }

                deployStack(couple.dockercompose, action, couple.name);
            } else {
                console.info("Action was not performed on", couple.name, "because its config file was not found");
            }
        }
    },

    deployStack(composeFile, action, stackName) {
        var shDockerStackDeploy;
        var curlDockerStackDeploy;
        if (action == "create" || action == "update") {
            shDockerStackDeploy = "docker stack deploy --compose-file " + composeFile + ' ' + stackName;
        } else if (action == "remove") {
            shDockerStackDeploy = "docker stack rm " + stackName;
        } else {
            gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, stackName, {error: "Action was not defined for stack"});
            console.error("Action not any of create, update or remove for ", stackName);
            return;
        }
        //if composeFile is yml => Docker API
        //if composeFile is json => Docker HTTP API (doesn't support stack yet)
        utils.execCmd(shDockerStackDeploy, function (error, stdout, stderr) {
            gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, stackName, gitlabUtil.getState(error, stderr, stdout));
        })
    }

};