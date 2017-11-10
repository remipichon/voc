var testUtil = require("./testUtil");

/*

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

let testSuite = {

    //making sure dry and do all are working
    commit_action__dry_run_do_all__without_context__nominal_case: function () {

        testUtil.prepare();

        testUtil.addFile("images/image.testdryrun.json", "images/Dockerfile.testdryrun");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert("Dry run __for testdryrun __all")) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    image__dry_run_do_all__non_remote_without_context__nominal_case: function () {

        testUtil.prepare();

        testUtil.addFile("images/image.nominalcase.json", "images/Dockerfile.nominalcase");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_stack_definition_docker_composes__dry_run_do_all__non_remote_without_context__nominal_case: function () {

        testUtil.prepare();

        testUtil.addFile(
            "instances/simple-stack-instance.nominalcase.mynominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml"
        );

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config_ [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    stack_instance_docker_compose__dry_run_do_all__non_remote_without_context__nominal_case: function () {

        testUtil.prepare();

        testUtil.addFile(
            "instances/stack-instance.nominalcase.mynominalcase.json",
            "stackdefinitions/stack-definition.nominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..] docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


};

let testcases = [];
if (process.argv.length == 2) {
    testcases = Object.keys(testSuite)
} else {
    if (process.argv[2] == "all") {
        testcases = Object.keys(testSuite)
    } else {
        if(!testSuite[process.argv[2]]) console.error("Test configuration error. Test is not part of test suite:",process.argv[2])
        else testcases.push(process.argv[2])
    }
}

class TestCaseError extends Error {

}

console.log("Starting test suite from test-suite.js running test cases:",testcases);
let anError;
try {
    testcases.forEach(testCase => {
        console.info(`=================================> starting test ${testCase}`);
        testSuite[testCase]();
        console.info(`<================================= test done `);
    });
} catch (error){
    if(error instanceof TestCaseError) {
        console.error(`!!! Test case ${error} FAILED`);
    } else {
        throw  error;
    }
}

