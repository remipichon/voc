'use strict';

var _ = require("underscore");
var utils = require("./utils");
var dockerUtils = require("./dockerUtil");

module.exports = {
    build: function (pathToCompose, dryRun = false) {
        const composeCmd = `${this.getComposeExec()} -f ${pathToCompose} build`;
        if(dryRun)
            return `Dry run: Docker would have run '${composeCmd}'`;
        return utils.execCmdSync(composeCmd, true);
    },

    getComposeExec: function () {
        return `${dockerUtils.getDockerCerts()} docker-compose `;
    }
};