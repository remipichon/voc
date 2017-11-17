var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    //   x  |SI|SSI dry_run_do_all__remote_with_context__non_trigger_via_context

    image__dry_run_do_all__remote_context__non_trigger_via_context: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyFile("remote-repo/image.remote-repo.remote-with_context.json", "remote-repo/repo.remote-repo.json");

        testUtil.copyGitAddFileRemoteRepo("images/Dockerfile.remote-with_context");
        testUtil.copyGitAddFileRemoteRepo({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" trigger via context on remote repo");

        testUtil.run();

        if (testUtil.assert(
                "There was nothing to do so I did nothing __for VOC __once"
            )) {
        } else {
            throw new TestCaseError(__test_case_name_1);
        }

    },

};
