'use strict';

var fsUtil = require("./fsUtil");
var gitUtil = require("./gitUtil");
var configuration = require("./configuration");
var resourceUtil = require("./resourceUtil");

module.exports = {
    main:  async function () {

        console.info("Reading repository to find resource files and create couple (resource file + related config file)");

        var allResourcePaths;
        try {
            allResourcePaths = await fsUtil.walkResourceFilePromise(configuration.repoFolder);
        } catch (error) {
            console.error("error", error);
            throw new Error(error)
        }

        let resources = fsUtil.getAllResourceFiles(allResourcePaths);

        let contextPaths = resources.contextPaths;
        let instances = resources.instances;
        let stackDefinitions = resources.stackDefinitions;
        let dockercomposes = resources.dockercomposes;

        let triggeredInstances = gitUtil.getGitDiffModifiedFile(contextPaths, instances, stackDefinitions, dockercomposes);

        resourceUtil.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes);

    }
}