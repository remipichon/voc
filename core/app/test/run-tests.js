var nominalCaseSuite = require("./test-suite-nominal-case");
var testSuiteTriggerViaConfig = require("./test-suite-trigger-via-config");
var TestCaseError = require("./TestCaseError");

/*

* create a new module with methods than contains follow code
* import module and add it to const testSuites

testUtil.prepare();

testUtil.addFile("...", "...");

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
    testSuiteTriggerViaConfig
];


let testcases = [];
if (process.argv.length == 2) {
    testSuites.forEach( suite => testcases = testcases.concat(Object.keys(suite)));
} else {
    if (process.argv[2] == "all") {
        testSuites.forEach( suite => testcases = testcases.concat(Object.keys(suite)));
    } else {
        if(!testSuites.find(suite => {
            return suite[process.argv[2]];
        }))
            console.error("Test configuration error. Test is not part of any test suite:",process.argv[2])
        else
            testcases.push(process.argv[2])
    }
}

console.log("Starting test suite from test-suite.js running test cases:",testcases);
let anError;
try {
    testcases.forEach(testCase => {
        console.info(`=================================> starting test ${testCase}`);
        testSuites.forEach(suite => {
            if(suite[testCase])
                suite[testCase]();
        });
        console.info(`<================================= test done `);
    });
} catch (error) {
    if (error instanceof TestCaseError) {
        console.error(`!!! Test case ${error} FAILED`);
    } else {
        throw  error;
    }
}

