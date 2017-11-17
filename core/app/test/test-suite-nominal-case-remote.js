var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

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
    //
    // image__dry_run_do_all__remote_without_context__dockerfile_free_name: function () {
    //
    //     testUtil.prepare();
    //     testUtil.prepareRemoteRepo();
    //
    //     testUtil.copyGitAddFile("remote-repo/image.remote-repo.Dockerfile_remote.json", "remote-repo/repo.remote-repo.json");
    //
    //     testUtil.copyGitAddFileRemoteRepo("images/Dockerfile_remote");
    //
    //     testUtil.commit("[dry-run] [do-all]");
    //
    //     testUtil.run();
    //
    //     if (testUtil.assert(
    //             "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once"
    //         )) {
    //
    //     } else {
    //         throw new TestCaseError(__test_case_name_1);
    //     }
    // },

    // simple_stack_instance_stack_definition_docker_composes__dry_run_do_all__non_remote_without_context__nominal_case: function () {
    //
    //     testUtil.prepare();
    //
    //     testUtil.copyGitAddFile(
    //         "instances/simple-stack-instance.nominalcase.mynominalcase.json",
    //         "dockercomposes/docker-compose.nominalcase.yml"
    //     );
    //
    //     testUtil.commit("[dry-run] [do-all]");
    //
    //     testUtil.run();
    //
    //     if (testUtil.assert(
    //             "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
    //             "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
    //             "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
    //         )) {
    //
    //     } else {
    //         throw new TestCaseError(__test_case_name_1);
    //     }
    // },
    //
    // stack_instance_docker_compose__dry_run_do_all__non_remote_without_context__nominal_case: function () {
    //
    //     testUtil.prepare();
    //
    //     testUtil.copyGitAddFile(
    //         "instances/stack-instance.nominalcase.mynominalcase.json",
    //         "stackdefinitions/stack-definition.nominalcase.json",
    //         "dockercomposes/docker-compose.nominalcase.yml");
    //
    //     testUtil.commit("[dry-run] [do-all]");
    //
    //     testUtil.run();
    //
    //     if (testUtil.assert(
    //             "Successfully config [..] docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
    //             "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
    //             "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
    //         )) {
    //
    //     } else {
    //         throw new TestCaseError(__test_case_name_1);
    //     }
    // },


};
