var _ = require("underscore");
var fs = require('fs');
var path_ = require('path');
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

Object.defineProperty(global, '__test_case_name_2', {
    get: function() {
        return __stack[2].getFunctionName();
    }
});

Object.defineProperty(global, '__test_case_name_1', {
    get: function() {
        return __stack[1].getFunctionName();
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
        try {
            fs.mkdirSync(configuration.repoFolder + configuration.artifactDir);
        } catch(error){
            if(error.code === "EEXIST"){
                console.log(`dir ${configuration.repoFolder + configuration.artifactDir} already exists`);
            } else
                throw new Error(error);
        }
        utils.execCmdSync("git init", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git config --global user.email 'test@example.com'; git config --global user.name 'Test User'", false, {cwd : configuration.repoFolder});

        utils.execCmdSync("touch dummy_file", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git add dummy_file;", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git commit -m \"add dummy_file\"", false, {cwd : configuration.repoFolder});
    },

    /**
     *
     * @param fileNames Array of file names or list for arguments as file names
     */
    addFile:function (...fileNames) {
        fileNames.forEach(path => {
            if(!fs.existsSync(`${this.testResourceLocation}/${path}`)){
                throw new Error(`Test configuration error, file ${this.testResourceLocation}/${path} doesn't exist`);
            }
            let fileName = path_.basename(path);
            fs.copyFileSync(`${this.testResourceLocation}/${path}`, `${configuration.repoFolder}/${fileName}`);
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
        let consoleLog = console.log
        let consoleInfo = console.info
        console.log = function(){}
        console.info = function(){}
        console.info("========================> Now running app");
        main.main();
        console.info("<======================== Running app is done");
        console.log = consoleLog
        console.info = consoleInfo
    },

    /**
     * @summary assert list of phrases are valid, compute result
     * @param ...phrases
     * @returns <Boolean> true is all asserts succeed, false if one failure
     */
    assert: function (...phrases) {
        let caseName = __test_case_name_2;
        let caseFile = __test_case_file_name;
        let caseLine = __test_case_line;
        let assertResult = {};
        phrases.forEach(phrase => {
            assertResult[phrase] = this.assertPhrase(phrase);
        });

        let testResult = {
            success: 0,
            failure: 0
        };
        let success = true;
        _.forEach(assertResult, (result, phrase) => {
           if(result === true){
               console.info(`SUCCESS while asserting '${phrase}'`);
               testResult.success += 1;
           } else {
               console.error(`FAILURE while asserting '${phrase}' \n\t\t${result}. File ${caseFile}:${caseLine}`)
               testResult.failure += 1;
               success = false;
           }
        });
        return success;
    },


    _assertWords: function (message, phrase) {
        let words = phrase.split("[..]");

        let allFound = "";
        words.forEach(word => { //word is a concept, it can actually contains spaces
            word = word.trim();
            if(message.indexOf(word) === -1) {
                allFound += ` a word (part of the test phrase) '${word}' was not found `
            }

        });

        return (allFound === "" )? true : allFound;
    },

    /**
     * @summary returns true if assert succeed, a string trying to explain error if failed
     * @param typeOfResult
     * @param testResult
     * @param targetResource
     * @param phrase
     * @returns {*}
     * @private
     */
    _assertPhrase: function (typeOfResult, testResult, targetResource, phrase) {

        if (typeOfResult == "all") {
            //words have to be in all results for resource
            let assertResult = null;
            _.forEach(testResult[targetResource], (message, type) => {
                if(assertResult !== null) return; //break loop
                if(type === "error") {
                    assertResult =  `${targetResource} has an 'error'. Only 'result' were expected `;
                    return;//continue loop
                }

                let assertWordResult = this._assertWords(message.result, phrase);

                //all
                if (assertWordResult !== true) {
                    assertResult = `Words from '${phrase}' were not found for _all results of '${targetResource}'`
                }
            });
            return (assertResult ===  null)? true: assertResult;

        } else if(typeOfResult == "once"){
            //words have to be exactly once amongst all results for resource

            let assertResult = null;
            // console.log("phrase",phrase)
            _.forEach(testResult[targetResource], (message, type) => {
                if(assertResult !== null) return; //break loop
                if(type === "error") {
                    assertResult =  `${targetResource} has an 'error'. Only 'result' were expected `;
                    return;//continue loop
                }

                let assertWordResult = this._assertWords(message.result, phrase);

                //no more than once
                if(assertWordResult === true){
                    if(assertResult === null){
                        assertResult = true;
                        return;
                    } else {
                        assertResult = `Words from string '${phrase}' were found more than _once in results of '${targetResource}'`
                        return;
                    }
                }

            });

            //at least once
            if(assertResult == null) {
                assertResult = `Not all words from '${phrase}' were found (_once  was expected) in results of '${targetResource}'`
            }

            return assertResult;

        }
        else {
            return `type of result ${typeOfResult} is not one of [_all, _once]`
        }
    },

    /**
     * @summary assert phrase is valid, return result
     * @param phrase <String> format is <string to search in test result> _for <target resource> _<which of _all, _any_result, _any_error, _any, _once>
     * @returns if assert failed, return <String> trying to explain why assertion failed, if assert success return true
     */
    assertPhrase: function(phrase){
        //<string to search in result> _for <target resource> _<which of _all, _any_result, _any_error, _any, _once>
        const phraseRegExp = /^(.*) __for (.*) __([a-z]*)/m

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
        let testResult = utils.readFileSyncToJson(configuration.repoFolder + configuration.artifactDir + configuration.resultFile);

        //using search for assert, throw error if assert not found
        if(testResult[targetResource]){
            return this._assertPhrase(typeOfResult, testResult, targetResource, searchString);
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

