var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    image__remote_without_context__trigger_via_config: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyGitAddFile("images/image.remote-repo.remote.json", "remote-repo/repo.remote-repo.json");

        testUtil.copyGitAddFileRemoteRepo("images/Dockerfile.remote");

        testUtil.commit(" [dry-run] trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "remote-repo: Successfully cloned remote repo ssh://root@127.0.0.1/root/git-server/remote-repo into [..] remote-repo __for remote-repo __once",
                "docker build [..] Dockerfile.remote [..] remote-image __for remote-image __once"
            )) {
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_docker_composes__remote_without_context__trigger_via_config: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyGitAddFile(
            "instances/simple-stack-instance.remote-repo.nominalcase.mynominalcase.json",
            "remote-repo/repo.remote-repo.json"
        );

        testUtil.copyGitAddFileRemoteRepo("dockercomposes/docker-compose.nominalcase.yml");

        testUtil.commit(" [dry-run] trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "remote-repo: Successfully cloned remote repo ssh://root@127.0.0.1/root/git-server/remote-repo into [..] remote-repo __for remote-repo __once",
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    stack_instance_stack_definition_docker_compose__remote_without_context__trigger_via_config: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyGitAddFile(
            "instances/stack-instance.remote-nominalcase.myremotenominalcase.json",
            "stackdefinitions/stack-definition.remote-repo.remote-nominalcase.json",
            "remote-repo/repo.remote-repo.json"
        );

        testUtil.copyGitAddFileRemoteRepo("dockercomposes/docker-compose.nominalcase.yml");

        testUtil.commit(" [dry-run] trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "remote-repo: Successfully cloned remote repo ssh://root@127.0.0.1/root/git-server/remote-repo into [..] remote-repo __for remote-repo __once",
                "Successfully config [..] docker-compose.nominalcase.yml [..] docker-compose.intermediate.myremotenominalcase.yml __for myremotenominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.myremotenominalcase.yml __for myremotenominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.myremotenominalcase.yml myremotenominalcase __for myremotenominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

};
