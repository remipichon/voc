var nominalCaseSuite = require("./test-suite-nominal-case");
var testSuiteTriggerViaConfig = require("./test-suite-trigger-via-config");
var testSuiteTriggerViaContext = require("./test-suite-trigger-via-context");
var TestCaseError = require("./TestCaseError");
var configuration = require("../configuration");
var _ = require("underscore");

/*

* create a new module with methods than contains follow code
* import module and add it to const testSuites

testUtil.prepare();

testUtil.copyGitAddFile("...", "...");

testUtil.commit("[dry-run] [do-all]");

testUtil.run();

if (testUtil.assert(
        "[..] __for ??? __???"
    )) {
    testUtil.cleanUp();
} else {
    throw new Error(__test_case_name_1+ " failed");
}

 */

const testSuites = [
    nominalCaseSuite,
    testSuiteTriggerViaConfig,
    testSuiteTriggerViaContext
];


let testcases = [];
if (process.argv.length == 2) {
    testSuites.forEach( suite => testcases = testcases.concat(Object.keys(suite)));
} else {
    if (process.argv[2] == "all") {
        testSuites.forEach( suite => testcases = testcases.concat(Object.keys(suite)));
    } else {
        for (var i = 2; i < process.argv.length ; i++) {
            if(!testSuites.find(suite => {
                    return suite[process.argv[i]];
                }))
                console.error("Test configuration error. Test is not part of any test suite:",process.argv[2])
            else
                testcases.push(process.argv[i])
        }
    }
}

if(process.env.LOG_LEVEL == "all")
    console.log("Log level is all");
console.log("Running test cases:",testcases);

if(process.env.CONTINUE_IF_ERROR == "true"){
    let failingTests = [];
    testcases.forEach(testCase => {
        console.info(`=================================> starting test ${testCase}`);
        testSuites.forEach(suite => {
            try {
                if (suite[testCase])
                suite[testCase]();
            } catch (error) {
                if (error instanceof TestCaseError) {
                    failingTests.push(error.message);
                    console.error(`!!! Test case ${error.message} FAILED`);
                } else {
                    throw  error;
                }
            }
        });
        console.info(`<================================= test done `);
    });
    if(failingTests.length !== 0){
        console.warn(`\t\t\t Dammit, ${failingTests.length} out of ${testcases.length} tests failed...`);
        console.warn(`\t${_.reduce(failingTests, (memo, test) => { return memo + "\n\t" + test})}`)
        console.warn(`!!! You can re-run the failing tests with:`);
        console.warn(`CI_PROJECT_DIR=${process.env.CI_PROJECT_DIR} TEST_RESOURCES=${process.env.TEST_RESOURCES} HOME=${process.env.HOME} LOG_LEVEL=all node run-tests.js ${_.reduce(failingTests, (memo, test) => { return memo + " " + test})}`)
        process.exit(1);
    } else {
        console.log(`\t\t\t Hurray, all ${testcases.length} tests were successful !!!`);
        process.exit(0);
    }
} else {
    try {
        testcases.forEach(testCase => {
            console.info(`=================================> starting test ${testCase}`);
            testSuites.forEach(suite => {
                if (suite[testCase])
                    suite[testCase]();
            });
            console.info(`<================================= test done `);
        });
    } catch (error) {
        if (error instanceof TestCaseError) {
            console.error(`!!! Test case ${error.message} FAILED`);
            console.error(`!!! You can check the actual result file at ${configuration.repoFolder + configuration.artifactDir + configuration.resultFile} and re-run the test with:`)
            console.error(`CI_PROJECT_DIR=${process.env.CI_PROJECT_DIR} TEST_RESOURCES=${process.env.TEST_RESOURCES} HOME=${process.env.HOME} LOG_LEVEL=all node run-tests.js ${error.message}`)
        } else {
            throw  error;
        }
    }

}

