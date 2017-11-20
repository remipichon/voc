var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    //   x  |SI|SSI dry_run_do_all__remote_without_context__trigger_via_config

    image__dry_run_do_all__remote_without_context__trigger_via_config: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyGitAddFile("images/image.remote-repo.remote.json", "remote-repo/repo.remote-repo.json");

        testUtil.copyGitAddFileRemoteRepo("images/Dockerfile.remote");

        testUtil.commit(" trigger via config and Docker related files ");

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
