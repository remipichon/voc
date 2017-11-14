var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    image__dry_run_do_all__non_remote_with_context__trigger_via_context: function () {

        testUtil.prepare();

        testUtil.copyFile("images/image.withcontext.json", "images/Dockerfile.withcontext");

        testUtil.copyGitAddFile({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" trigger via context ");

        testUtil.run();

        if (testUtil.assert(
                "docker build [..] Dockerfile.withcontext [..] withcontext __for withcontext __once",
                "docker push registrytopush:5000/withcontext __for registrytopush:5000/withcontext __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_stack_definition_docker_composes__dry_run_do_all__non_remote_with_context__trigger_via_context: function () {

        testUtil.prepare();

        testUtil.copyFile(
            "instances/simple-stack-instance.withcontext.mywithcontext.json",
            "dockercomposes/docker-compose.withcontext.yml"
        );

        testUtil.copyGitAddFile({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" trigger via context ");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..]  docker-compose.withcontext.yml [..] docker-compose.intermediate.mywithcontext.yml __for mywithcontext __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mywithcontext.yml __for mywithcontext __once",
                "docker stack deploy [..] docker-compose.intermediate.mywithcontext.yml mywithcontext __for mywithcontext __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    stack_instance_docker_compose__dry_run_do_all__non_remote_with_context__trigger_via_context: function () {

        testUtil.prepare();

        testUtil.copyFile(
            "instances/stack-instance.withcontext.mywithcontext.json",
            "stackdefinitions/stack-definition.withcontext.json",
            "dockercomposes/docker-compose.withcontext.yml");

        testUtil.copyGitAddFile({source:"context/dummy_context_file", destination: "context"});

        testUtil.commit(" trigger via context ");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..] docker-compose.withcontext.yml [..] docker-compose.intermediate.mywithcontext.yml __for mywithcontext __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mywithcontext.yml __for mywithcontext __once",
                "docker stack deploy [..] docker-compose.intermediate.mywithcontext.yml mywithcontext __for mywithcontext __once",
            )) {
            testUtil.cleanUp();
        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


};
