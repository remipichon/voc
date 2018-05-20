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


var pjson = require('./package.json');
console.log("running VOC Runner app version",pjson.version);

let defaultLevel = "info";
if(process.env.LOG_LEVEL){
    let logLevels = "";
    Object.keys(log.levels).forEach(key => {logLevels += ` ${key}`});
    if(logLevels.indexOf(process.env.LOG_LEVEL) === -1 ){
        console.error(`env LOG_LEVEL is set to ${process.env.LOG_LEVEL} which is not part of available levels ${logLevels}`)
    } else {
        defaultLevel = process.env.LOG_LEVEL;
    }
}
console.log("Setting log level to", defaultLevel);
log.setLevel(defaultLevel);

if (!process.env.CI_PROJECT_DIR) {
    log.error("CI_PROJECT_DIR is not defined or empty");
    process.exit(1)
}

log.debug("Starting main.main() using configuration:");
Object.keys(configuration).forEach(key => {if(typeof configuration[key] == "string") log.debug(`    ${key} : ${configuration[key]}`)});

if(process.env.DEV) {
    log.debug("cleaning result.json");
    utils.execCmdSync("rm " + configuration.repoFolder + configuration.artifactDir + configuration.resultFile, true);
}

main.main();

