var log = require('loglevel');
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
    gitLocalForRemoteRepo: "/root/local-for-remote-repo",
    gitServerRemoteRepo: "/root/git-server/remote-repo",

    /**
     * @summary git init repo
     */
    prepare: function () {
        utils.execCmdSync(`rm -rf ${configuration.repoFolder}`);
        utils.execCmdSync(`rm -rf ${configuration.repoFolder + configuration.artifactDir}`);
        fs.mkdirSync(configuration.repoFolder);
        fs.mkdirSync(configuration.repoFolder + configuration.artifactDir);

        utils.execCmdSync("git init", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git config --global user.email 'test@example.com'; git config --global user.name 'Test User'", false, {cwd : configuration.repoFolder});

        //one commit to make sure repo is working
        utils.execCmdSync("touch dummy_file", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git add dummy_file;", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git commit -m \"add dummy_file\"", false, {cwd : configuration.repoFolder});
    },

    /**
     * @summary git init remote repo
     */
    prepareRemoteRepo: function () {
        utils.execCmdSync(`rm -rf ${this.gitServerRemoteRepo}`);
        utils.execCmdSync(`rm -rf ${this.gitLocalForRemoteRepo}`);
        utils.execCmdSync(`rm -rf ${configuration.remoteRepoFolder}`);
        utils.execCmdSync(`mkdir -p ${this.gitServerRemoteRepo}`);
        utils.execCmdSync(`mkdir -p ${this.gitLocalForRemoteRepo}`);

        utils.execCmdSync("git init --bare", false, {cwd : this.gitServerRemoteRepo});

        utils.execCmdSync("git init", false, {cwd : this.gitLocalForRemoteRepo});
        utils.execCmdSync(`git remote add origin ssh://root@127.0.0.1${this.gitServerRemoteRepo}`, false, {cwd : this.gitLocalForRemoteRepo});
        utils.execCmdSync("git config --global user.email 'test@example.com'; git config --global user.name 'Test User'", false, {cwd : this.gitLocalForRemoteRepo});

        //one commit to make sure repo is working
        utils.execCmdSync("touch dummy_file", false, {cwd : this.gitLocalForRemoteRepo});
        utils.execCmdSync("git add dummy_file;", false, {cwd : this.gitLocalForRemoteRepo});
        utils.execCmdSync("git commit -m \"add dummy_file\"", false, {cwd : this.gitLocalForRemoteRepo});
    },

    /**
     * @summary copy and commit file to test repo defined by configuration.repoFolder 
     * @param fileNames List<String|<source,destination>>
     *     if <source,destination>, source is where the file is (full path to the file), destination is the folder in which the file will be copied with same name
     *
     */
    copyGitAddFile:function (...fileNames) {
        this.copyFile(...fileNames);
        fileNames.forEach(path => {
            let fileName;
            if(typeof path == 'object'){
                fileName = `${path.destination}/${path_.basename(path.source)}`;
            } else {
                fileName = path_.basename(path);
            }
            utils.execCmdSync(`git add ${fileName}`, false, {cwd : configuration.repoFolder});
        })
    },

    /**
     * @summary copy and commit file to mocked remote repo defined by this.gitLocalForRemoteRepo
     * @param fileNames List<String|<source,destination>>
     *     if <source,destination>, source is where the file is (full path to the file), destination is the folder in which the file will be copied with same name
     *
     */
    copyGitAddFileRemoteRepo:function (...fileNames) {
        this._copyFile(this.gitLocalForRemoteRepo,...fileNames);
        fileNames.forEach(path => {
            let fileName;
            if(typeof path == 'object'){
                fileName = `${path.destination}/${path_.basename(path.source)}`;
            } else {
                fileName = path_.basename(path);
            }
            utils.execCmdSync(`git add ${fileName}`, false, {cwd : this.gitLocalForRemoteRepo});
        });
        utils.execCmdSync(`git commit -m 'adding files on remote repo'`, false, {cwd : this.gitLocalForRemoteRepo});
        utils.execCmdSync(`git push origin master`, false, {cwd : this.gitLocalForRemoteRepo});
    },

    /**
     * @summary copy file to configuration.repoFolder
     * @param fileNames List<String|<source,destination>>
     *     if <source,destination>, source is where the file is (full path to the file), destination is the folder in which the file will be copied with same name
     *
     */
    copyFile:function (...fileNames) {
        this._copyFile(configuration.repoFolder, ...fileNames)
    },

    /**
     * @summary private method as helper for copyFile and copyGitAddFileRemoteRepo
     * @param repoFolder
     * @param fileNames
     * @private
     */
    _copyFile:function (repoFolder, ...fileNames) {
        fileNames.forEach(path => {
            let sourcePath, destPath;

            if(typeof path === "object"){
                let fileName = path_.basename(path.source);
                sourcePath = `${this.testResourceLocation}/${path.source}`;
                destPath = `${repoFolder}/${path.destination}/${fileName}`;

                try {
                    fs.mkdirSync(`${repoFolder}/${path.destination}`);
                } catch(error){
                    if(error.code === "EEXIST"){
                        log.log(`dir ${destPath} already exists`);
                    } else
                        throw new Error(error);
                }

            } else {
                let fileName = path_.basename(path);
                sourcePath = `${this.testResourceLocation}/${path}`;
                destPath = `${repoFolder}/${fileName}`;
            }

            if(!fs.existsSync(sourcePath)){
                throw new Error(`Test configuration error, file ${sourcePath} doesn't exist`);
            }
            // fs.copyFileSync(sourcePath, destPath);
            utils.execCmdSync(`cp ${sourcePath} ${destPath}`, false, {cwd : configuration.repoFolder});

        })
    },

    commit: function(commitMessage){
        //editing and adding dummy_file in case there was no previously git add files
        utils.execCmdSync("echo banane >> dummy_file", false, {cwd : configuration.repoFolder});
        utils.execCmdSync("git add dummy_file", false, {cwd : configuration.repoFolder});
        utils.execCmdSync(`git commit -m '${commitMessage}'`, false, {cwd : configuration.repoFolder});
    },

    /**
     * @summary run the full app, currently only the NodeJs Runner App is supported
     */
    run: function (logLevel = process.env.APP_LOG_LEVEL || log.levels.SILENT) {
        log.info(`========================> Now running app with log level ${logLevel} of `,log.levels);
        log.setLevel(logLevel);
        main.main();
        log.setLevel(log.levels.INFO);
        log.info("<======================== Running app is done");
    },


    /**
     * @summary same as assert(...phrases) but will also ensure that there is no other result than the one being asserted (regardless of resources)
     * @param phrases
     */
    assertExhaustive: function (...phrases) {
        if(!this.assert(...phrases)) return false;

        //count phrase
        let testResult = utils.readFileSyncToJson(configuration.repoFolder + configuration.artifactDir + configuration.resultFile);
        let count = 0;
        _.each(testResult,(results, resources) => {
            count += results.length;
        });

        if(count !== phrases.length){
            log.error(`FAILURE while asserting exhaustive. ${phrases.length} phrases were submitted while ${count} results were found amongst resources.`);
            return false;
        }
        return true
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
               log.info(`SUCCESS while asserting '${phrase}'`);
               testResult.success += 1;
           } else {
               log.error(`FAILURE while asserting '${phrase}' \n\t\t${result}. File ${caseFile}:${caseLine}`)
               testResult.failure += 1;
               success = false;
           }
        });
        return success;
    },

    assertError: function(...phrases){
        let caseName = __test_case_name_2;
        let caseFile = __test_case_file_name;
        let caseLine = __test_case_line;
        let assertResult = {};
        phrases.forEach(phrase => {
            assertResult[phrase] = this.assertPhrase(phrase, true);
        });

        let testResult = {
            success: 0,
            failure: 0
        };
        let success = true;
        _.forEach(assertResult, (result, phrase) => {
            if(result === true){
                log.info(`SUCCESS while asserting error '${phrase}'`);
                testResult.success += 1;
            } else {
                log.error(`FAILURE while asserting error '${phrase}' \n\t\t${result}. File ${caseFile}:${caseLine}`)
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
    _assertPhrase: function (typeOfResult, testResult, targetResource, phrase, assertError) {

        let target = "result";
        if(assertError)
            target = "error";

        if (typeOfResult == "all") {
            //words have to be in all results for resource
            let assertResult = null;
            _.forEach(testResult[targetResource], (message, type) => {
                if(assertResult !== null) return; //break loop
                if(type === "error") {
                    assertResult =  `${targetResource} has an 'error'. Only 'result' were expected `;
                    return;//continue loop
                }

                let assertWordResult = this._assertWords(message[target], phrase);

                //all
                if (assertWordResult !== true) {
                    assertResult = `Words from '${phrase}' were not found for _all results of '${targetResource}'`
                }
            });
            return (assertResult ===  null)? true: assertResult;

        } else if(typeOfResult == "once"){
            //words have to be exactly once amongst all results for resource

            let assertResult = null;
            // log.log("phrase",phrase)
            _.forEach(testResult[targetResource], (message, type) => {
                if(assertResult !== null) return; //break loop
                if(type === "error") {
                    assertResult =  `${targetResource} has an 'error'. Only 'result' were expected `;
                    return;//continue loop
                }
                let assertWordResult = this._assertWords(message[target], phrase);

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
    assertPhrase: function(phrase, assertError = false){
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
        // log.log("DEBUG Asserting","searchString",searchString, "targetResource", targetResource, "typeOfResult",typeOfResult);

        //read file where is it
        let testResult = utils.readFileSyncToJson(configuration.repoFolder + configuration.artifactDir + configuration.resultFile);

        //using search for assert, throw error if assert not found
        if(testResult[targetResource]){
            return this._assertPhrase(typeOfResult, testResult, targetResource, searchString, assertError);
        } else {
            return `target resource ${targetResource} not part of result file`
        }
    },
    
};

