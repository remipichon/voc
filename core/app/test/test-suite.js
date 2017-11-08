var testUtil = require("./testUtil");


let testSuite = {

    basic_commit_action_dry_do_all_without_context: function () {


        testUtil.prepare();

        testUtil.addFile("image.testdryrun.json", "Dockerfile.testdryrun");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert("Dry run _for testdryrun _all")) {
            testUtil.cleanUp()
        }

    }

};



console.log("Starting test suite from test-suite.js");
Object.keys(testSuite).forEach(testCase => {
   testSuite[testCase]();
});

