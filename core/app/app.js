var composeUtil = require("./composeUtil");
var configuration = require("./configuration");
var dockerUtil = require("./dockerUtil");
var fsService = require("./fsService");
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
var YAML = require('yamljs');
var configuration = require("./configuration");


if (!process.env.CI_PROJECT_DIR) {
    console.error("CI_PROJECT_DIR is not defined or empty");
    process.exit(1)
}

console.log("Starting main.main() using configuration:");
Object.keys(configuration).forEach(key => {if(typeof configuration[key] == "string") console.log(`    ${key} : ${configuration[key]}`)});

if(process.env.DEV) {
    console.debug("cleaning result.json");
    utils.execCmdSync("rm " + configuration.repoFolder + configuration.artifactDir + configuration.resultFile, true);
}

main.main().catch(err => {
    console.error(err);
    process.exit(1);
});
