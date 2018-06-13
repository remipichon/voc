
var log = require('loglevel');
var utils = require("./utils");
var gitlabUtil = require("./gitlabUtil");
var composeUtil = require("./composeUtil");
var dockerUtils = require("./dockerUtil");

module.exports = {

    manageStack(instance, dockercomposePath, dryRun = false) {
        let stackName = instance.instanceName;

        if (instance.toClean) {
            this.deployStack(stackName, "remove", null, dryRun);
        } else {
          let instanceConfig = utils.readFileSyncToJson(instance.path);

          if(instanceConfig.enabled && instance.toBuild){
                let result = composeUtil.build(dockercomposePath, dryRun);
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

            if(instance.toDeploy) {
                var action;
                if (instanceConfig.enabled) {
                    action = "update"
                } else {
                    action = "remove"
                }

                this.deployStack(stackName, action, dockercomposePath, dryRun);
            }
        }
    },

    /**
     *
     * @param stackName     <String>
     * @param action        <String> [update|remove]
     * @param composeFile   <String> absolute path to single docker compose
     */
    deployStack(stackName, action, composeFile, dryRun = false) {
        //cannot use docker API because stack is a client feature only
        let dnsStackName = stackName.replace('.', '_');
        var shDockerStackDeploy;
        if (action == "create" || action == "update") {
            shDockerStackDeploy = dockerUtils.getDockerExec() + "stack deploy --compose-file " + composeFile + ' ' + dnsStackName;
        } else if (action == "remove") {
            shDockerStackDeploy = dockerUtils.getDockerExec() + "stack rm " + dnsStackName;
        } else {
            utils.writeResult(stackName, {error: "Action was not defined for stack"});
            log.error(`${stackName}: Action not any of create, update or remove. Skipping`);
            return;
        }
        log.info(`     ${stackName}: Stack ${dnsStackName} is going to be ${action} using docker compose file ${composeFile}. Command is:\n${shDockerStackDeploy}`);
        if(!dryRun)
            utils.execCmd(shDockerStackDeploy, function (error, stdout, stderr) {
                let state = gitlabUtil.getState(error, stderr, stdout);
                if(action === "remove")
                    if(state.result && state.result.indexOf("Nothing found in stack") !== -1)
                        state.result = `Stack ${stackName} has already been removed, nothing has be done because there was nothing to do`;
                utils.writeResult(stackName, state);
            });
        else
            utils.writeResult(stackName, {result: `Dry run: Docker would have run '${shDockerStackDeploy}'`});
    }

};