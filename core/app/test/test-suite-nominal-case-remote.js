var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    //   x  |SI|SSI dry_run_do_all__remote_without_context__nominal_case


    image__dry_run_do_all__remote_without_context__nominal_case: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyGitAddFile("remote-repo/image.remote-repo.remote.json", "remote-repo/repo.remote-repo.json");

        testUtil.copyGitAddFileRemoteRepo("images/Dockerfile.remote");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "remote-repo: Successfully cloned remote repo ssh://root@127.0.0.1/root/git-server/remote-repo into [..] remote-repo __for remote-repo __once",
                "docker build [..] Dockerfile.remote [..] remote-image __for remote-image __once"
            )) {
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

};
