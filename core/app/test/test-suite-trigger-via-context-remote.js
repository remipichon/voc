var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    image__remote_context__non_trigger_via_context: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyFile("images/image.remote-repo.remote-with_context.json", "remote-repo/repo.remote-repo.json");

        testUtil.copyGitAddFileRemoteRepo("images/Dockerfile.remote-with_context");
        testUtil.copyGitAddFileRemoteRepo({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" [dry-run] non trigger via context on remote repo");

        testUtil.run();

        if (testUtil.assert(
                "There was nothing to do so I did nothing __for VOC __once"
            )) {
        } else {
            throw new TestCaseError(__test_case_name_1);
        }

    },

    simple_stack_instance_docker_composes__remote_without_context__non_trigger_via_context: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyFile(
            "instances/simple-stack-instance.remote-repo.withcontext.myremotewithcontext.json",
            "remote-repo/repo.remote-repo.json"
        );

        testUtil.copyGitAddFileRemoteRepo("dockercomposes/docker-compose.withcontext.yml");
        testUtil.copyGitAddFileRemoteRepo({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" [dry-run] non trigger via context on remote repo");

        testUtil.run();

        if (testUtil.assert(
                "There was nothing to do so I did nothing __for VOC __once"
            )) {
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    stack_instance_stack_definition_docker_compose__remote_without_context__non_trigger_via_context: function () {

        testUtil.prepare();
        testUtil.prepareRemoteRepo();

        testUtil.copyFile(
            "instances/stack-instance.remote-withcontext.myremotewithcontext.json",
            "stackdefinitions/stack-definition.remote-repo.remote-withcontext.json",
            "remote-repo/repo.remote-repo.json"
        );

        testUtil.copyGitAddFileRemoteRepo("dockercomposes/docker-compose.nominalcase.yml");
        testUtil.copyGitAddFileRemoteRepo({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" [dry-run] non trigger via context on remote repo");

        testUtil.run();

        if (testUtil.assert(
                "There was nothing to do so I did nothing __for VOC __once"
            )) {
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


};
