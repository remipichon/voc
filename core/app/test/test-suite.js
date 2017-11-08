var testUtil = require("./testUtil");


let testSuite = {

    //making sure dry and do all are working
    commit_action__dry_run_do_all__without_context__nominal_case: function () {

        testUtil.prepare();

        testUtil.addFile("image.testdryrun.json", "Dockerfile.testdryrun");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert("Dry run __for testdryrun __all"))
            testUtil.cleanUp();
        else {
            throw new Error("commit_action__dry_run_do_all__without_context__nominal_case failed");
        }
    },

    image__dry_run_do_all__non_remote_without_context__nominal_case: function () {

        testUtil.prepare();

        testUtil.addFile("image.nominalcase.json", "Dockerfile.nominalcase");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new Error("commit_action__dry_run_do_all__without_context__nominal_case failed");
        }
    },

    simple_stack_instance_stack_definition_docker_composes__dry_run_do_all__non_remote_without_context__nominal_case: function () {

        // which files ?

        // Assert docker-compose config  $sd.composes sidryrun _once

        // Assert docker-compose build ${docker-composeintermediate} sidryrun _once

        // Assert docker stack deploy ${docker-composeintermediate} ${stackname} sidryrun _once

    },

    stack_instance_docker_compose__dry_run_do_all__non_remote_without_context__nominal_case: function () {

        // which files ?

        // Assert docker-compose build ${docker-composeintermediate} ssidryrun _once

        // Assert docker stack deploy ${docker-composeintermediate} ${stackname} ssidryrun _once
    },


};

console.log("script args", process.argv);

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

console.log("Starting test suite from test-suite.js running test cases:",testcases);
testcases.forEach(testCase => {
    console.info(`=================================> starting test ${testCase}`);
    testSuite[testCase]();
    console.info(`<================================= test done `);
});

