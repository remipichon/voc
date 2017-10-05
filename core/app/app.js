var composeUtil = require("./composeUtil");
var configuration = require("./configuration");
var dockerUtil = require("./dockerUtil");
var fsUtil = require("./fsUtil");
var gitlabUtil = require("./gitlabUtil");
var gitUtil = require("./gitUtil");
var imageUtil = require("./imageUtil");
var resourceUtil = require("./resourceUtil");
var stackUtil = require("./stackUtil");
var utils = require("./utils");
var _ = require("underscore");
var main = require("./main");


console.log("env", process.env);
if (!process.env.CI_PROJECT_DIR) {
    console.error("CI_PROJECT_DIR is not defined or empty");
    process.exit(1)
}





console.log("Starting main.main()......");

main.main().catch(err => {
    console.error(err);
    process.exit(1);
});
