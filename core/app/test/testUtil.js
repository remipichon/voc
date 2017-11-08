var _ = require("underscore");
var fs = require('fs');
var utils = require("../utils");
var main = require("../main");
var configuration = require("../configuration");

Object.defineProperty(global, '__stack', {
    get: function() {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack) {
            return stack;
        };
        var err = new Error;
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

Object.defineProperty(global, '__test_case_file_name', {
    get: function() {
        return __stack[2].getFileName();
    }
});

Object.defineProperty(global, '__test_case_line', {
    get: function() {
        return __stack[2].getLineNumber();
    }
});

Object.defineProperty(global, '__test_case_name', {
    get: function() {
        return __stack[2].getFunctionName();
    }
});


module.exports = {

    //relative to the test-suite js file
    testResourceLocation: process.env.TEST_RESOURCES,

    /**
     * @summary git init repo
     */
    prepare: function () {
        this.cleanUp();
        try {
            fs.mkdirSync(configuration.repoFolder);
        } catch(error){
            if(error.code === "EEXIST"){
                console.log(`dir ${configuration.repoFolder} already exists`);
            } else
                throw new Error(error);
        }
        utils.execCmdSync("git config --global user.email 'test@example.com'; git config --global user.name 'Test User'", {cwd : configuration.repoFolder});
        utils.execCmdSync("git init", false, {cwd : configuration.repoFolder});
    },

    /**
     *
     * @param fileNames Array of file names or list for arguments as file names
     */
    addFile:function (...fileNames) {
        fileNames.forEach(fileName => {
            if(!fs.existsSync(`${this.testResourceLocation}/${fileName}`)){
                throw new Error(`Test configuration error, file ${this.testResourceLocation}/${fileName} doesn't exist`);
            }
            fs.copyFileSync(`${this.testResourceLocation}/${fileName}`, `${configuration.repoFolder}/${fileName}`);
            utils.execCmdSync(`git add ${fileName}`, false, {cwd : configuration.repoFolder});
        })
    },

    commit: function(commitMessage){
        utils.execCmdSync(`git commit -m '${commitMessage}'`, false, {cwd : configuration.repoFolder});
    },

    /**
     * @summary run the full app, currently only the NodeJs Runner App is supported
     */
    run: function () {
        console.info("========================> Now running app");
        main.main();
        console.info("<======================== Running app is done");
    },

    /**
     * @summary assert list of phrases are valid, compute result
     * @param ...phrases
     * @returns <Boolean> true is all asserts succeed, false if one failure
     */
    assert: function (...phrases) {
        let caseName = __test_case_name;
        let caseFile = __test_case_file_name;
        let caseLine = __test_case_line;
        let assertResult = {};
        phrases.forEach(phrase => {
            assertResult[phrase] = this.assertPhrase(phrase);
        });

        let success = true;
        _.forEach(assertResult, (result, phrase) => {
           if(result === true){
               console.info(`SUCCESS: ${caseName}: assert '${phrase}'`);
           } else {
               console.error(`FAILURE: ${caseName}: assert '${phrase}' \n\t\t${result}. File ${caseFile}:${caseLine}`)
           }
        });
        return success;
    },

    _resolveAssertPhrase: function (typeOfResult, testResult, targetResource, searchString) {
        if (typeOfResult == "all") {  //search string has to be in all results/errors for resource
            let result = true;
            _.forEach(testResult[targetResource], (message, type) => {
                if (result !== true) return;
                if (message.indexOf(searchString) === -1) {
                    result = `search string '${searchString}' was not found for _all results/errors of '${targetResource}'`
                }
            });
            return result;
        }
        //TODO the others
        else {
            return `type of result ${typeOfResult} is not one of [_all]`
        }
    },

    /**
     * @summary assert phrase is valid, return result
     * @param phrase <String> format is <string to search in test result> _for <target resource> _<which of _all, _any_result, _any_error, _any, _once>
     * @returns if assert failed, return <String> trying to explain why assertion failed, if assert success return true
     */
    assertPhrase: function(phrase){
        //<string to search in result> _for <target resource> _<which of _all, _any_result, _any_error, _any, _once>
        const phraseRegExp = /^([A-Za-z0-9 ]*) _for ([A-Za-z0-9 ]*) _([a-z]*)/m

        var match = phraseRegExp.exec(phrase);
        let searchString, targetResource, typeOfResult;
        if (match && match.length === 4) {
            searchString = match[1];
            targetResource = match[2];
            typeOfResult = match[3];
        } else {
            throw new Error(`Test configuration error: Assert phrase ${phrase} doesn't match regexp ${phraseRegExp}`)
        }
        // console.log("DEBUG Asserting","searchString",searchString, "targetResource", targetResource, "typeOfResult",typeOfResult);

        //read file where is it
        let testResult = utils.readFileSyncToJson(configuration.repoFolder + configuration.artifactDir + configuration.resultFile)

        //using search for assert, throw error if assert not found
        if(testResult[targetResource]){
            return this._resolveAssertPhrase(typeOfResult, testResult, targetResource, searchString);
        } else {
            return `target resource ${targetResource} not part of result file`
        }
    },


    /**
     * @summary remove git repo folder
     */
    cleanUp: function(){
        utils.execCmdSync(`rm -rf ${configuration.repoFolder}`);
    }

};

