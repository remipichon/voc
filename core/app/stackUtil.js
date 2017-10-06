
var _ = require("underscore");
var gitlabUtil = require("./gitlabUtil");
var configuration = require("./configuration");
var utils = require("./utils");
var composeUtil = require("./composeUtil");

module.exports = {

    manageStack(instance, dockercomposePath) {
        let stackName = instance.instanceName;

        if (instance.toClean) {
            this.deployStack(stackName, "remove");
        } else {
            if(instance.toBuild){
                let result = composeUtil.build(dockercomposePath);
                if(result.error){
                    gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, stackName, {
                        error: `An error occurred while building ${stackName} from ${dockercomposePath}. Stack will not be deployed. Error: ${result.error} `
                    });
                    return;
                }
                gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, stackName, {result: result});
            }
            let instanceConfig = utils.readFileSyncToJson(instance.path);

            var action;
            if (instanceConfig.enabled) {
                action = "update"
            } else {
                action = "remove"
            }

            this.deployStack(stackName, action, dockercomposePath);
        }
    },

    /**
     *
     * @param stackName     <String>
     * @param action        <String> [update|remove]
     * @param composeFile   <String> absolute path to single docker compose
     */
    deployStack(stackName, action, composeFile) {
        //TODO make use of dockerUtil
        var shDockerStackDeploy;
        if (action == "create" || action == "update") {
            shDockerStackDeploy = "docker stack deploy --compose-file " + composeFile + ' ' + stackName;
        } else if (action == "remove") {
            shDockerStackDeploy = "docker stack rm " + stackName;
        } else {
            gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, stackName, {error: "Action was not defined for stack"});
            console.error("Action not any of create, update or remove for ", stackName);
            return;
        }
        console.info(`Stack ${stackName} is going to be ${action} using docker compose file ${composeFile}. Command is:\n    ${shDockerStackDeploy}`);
        utils.execCmd(shDockerStackDeploy, function (error, stdout, stderr) {
            gitlabUtil.writeResult(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, stackName, gitlabUtil.getState(error, stderr, stdout));
        })
    }

};