'use strict';

var _ = require("underscore");
var utils = require("./utils");

module.exports = {
    build: function (pathToCompose) {
        const composeCmd = `docker-compose -f ${pathToCompose} build`;
        let stdout = utils.execCmdSync(composeCmd, true);
        return stdout;
    }
};