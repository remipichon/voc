
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
                    utils.writeResult(stackName, {
                        error: `${stackName}: An error occurred while building from ${dockercomposePath}. Stack will not be deployed. Error: ${result.error} `
                    });
                    return;
                }
                if(result == '')
                    result = `${stackName}: Nothing to build from ${dockercomposePath}`;
                utils.writeResult(stackName, {result: result});
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
        let dnsStackName = stackName.replace('.', '_');
        var shDockerStackDeploy;
        if (action == "create" || action == "update") {
            shDockerStackDeploy = "docker stack deploy --compose-file " + composeFile + ' ' + dnsStackName;
        } else if (action == "remove") {
            shDockerStackDeploy = "docker stack rm " + dnsStackName;
        } else {
            utils.writeResult(stackName, {error: "Action was not defined for stack"});
            console.error(`${stackName}: Action not any of create, update or remove. Skipping`);
            return;
        }
        console.info(`     ${stackName}: Stack is going to be ${action} as ${dnsStackName} using docker compose file ${composeFile}. Command is:\n${shDockerStackDeploy}`);
        utils.execCmd(shDockerStackDeploy, function (error, stdout, stderr) {
            utils.writeResult(stackName, gitlabUtil.getState(error, stderr, stdout));
        })
    }

};