'use strict';

var _ = require("underscore");
var utils = require("./utils");

module.exports = {
    build: function (pathToCompose, dryRun = false) {
        const composeCmd = `docker-compose -f ${pathToCompose} build`;
        if(dryRun)
            return `Dry run: Docker would have run '${composeCmd}'`;
        return utils.execCmdSync(composeCmd, true);
    }
};