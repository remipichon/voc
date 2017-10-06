'use strict';

var fs = require('fs');
var _ = require("underscore");
var configuration = require("./configuration");

module.exports = {

    writeResult: function (artifactDir, resultFile, repoFolder, key, value) {
        console.log(configuration.artifactDir, configuration.resultFile, configuration.repoFolder, key, value);

        var resultJson = {};
        if (fs.existsSync(configuration.repoFolder + configuration.artifactDir + configuration.resultFile)) {
            var resultTest = fs.readFileSync(configuration.repoFolder + configuration.artifactDir + configuration.resultFile).toString();
            resultJson = JSON.parse(resultTest);
        }
        if (resultJson[key]) {
            if (!Array.isArray(resultJson[key])) {
                var previous = resultJson[key];
                resultJson[key] = [];
                resultJson[key].push(previous)
            }
            resultJson[key].push(value);
        } else
            resultJson[key] = value;
        if (!fs.existsSync(configuration.repoFolder + configuration.artifactDir)) {
            fs.mkdirSync(configuration.repoFolder + configuration.artifactDir);
        }
        console.log("resultJson", resultJson);
        fs.writeFileSync(configuration.repoFolder + configuration.artifactDir + configuration.resultFile, JSON.stringify(resultJson));
    },

    getState(error, stderr, stdout) {
        var state = {};
        if (error) {
            state.error = stderr + " : " + JSON.stringify(error);
        } else {
            state.result = stdout || stderr;
        }
        return state;
    }

};