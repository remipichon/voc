var composeUtil = require("./composeUtil");
var configuration = require("./configuration");
var dockerUtil = require("./dockerUtil");
var fsUtil = require("./fsUtil");
var gitlabUtil = require("./gitlabUtil");
var gitService = require("./gitService");
var imageService = require("./imageService");
var resourceUtil = require("./resourceUtil");
var resourceService = require("./resourceService");
var stackService = require("./stackService");
var utils = require("./utils");
var _ = require("underscore");
var main = require("./main");
var log = require('loglevel');
var YAML = require('yamljs');
var configuration = require("./configuration");


if (!process.env.CI_PROJECT_DIR) {
    log.error("CI_PROJECT_DIR is not defined or empty");
    process.exit(1)
}

log.log("Starting main.main() using configuration:");
Object.keys(configuration).forEach(key => {if(typeof configuration[key] == "string") log.log(`    ${key} : ${configuration[key]}`)});

if(process.env.DEV) {
    log.debug("cleaning result.json");
    utils.execCmdSync("rm " + configuration.repoFolder + configuration.artifactDir + configuration.resultFile, true);
}

log.setLevel("trace");
main.main();

