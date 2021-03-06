var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    image__non_remote_without_context__trigger_via_config: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile("images/image.nominalcase.json", "images/Dockerfile.nominalcase");

        testUtil.commit(" [dry-run] trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for nominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_docker_composes__non_remote_without_context__trigger_via_config: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile(
            "instances/simple-stack-instance.nominalcase.mynominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml"
        );

        testUtil.commit(" [dry-run] trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_docker_composes__non_remote_without_context__trigger_via_dockercompose: function () {

        testUtil.prepare();

        testUtil.copyFile("instances/simple-stack-instance.nominalcase.mynominalcase.json")

        testUtil.copyGitAddFile(
            "dockercomposes/docker-compose.nominalcase.yml"
        );

        testUtil.commit(" [dry-run] trigger via config and docker-compose file");

        testUtil.run();

        if (testUtil.assertExhaustive(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_docker_composes_names_matches__non_remote_without_context__trigger_via_dockercompose: function () {

        testUtil.prepare();

        testUtil.copyFile("instances/simple-stack-instance.nominalcase.nominalcase.json")

        testUtil.copyGitAddFile(
            "dockercomposes/docker-compose.nominalcase.yml"
        );

        testUtil.commit(" [dry-run] trigger via config and docker-compose file");

        testUtil.run();

        if (testUtil.assertExhaustive(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.nominalcase.yml __for nominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.nominalcase.yml nominalcase __for nominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


    stack_instance_stack_definition_docker_compose__non_remote_without_context__trigger_via_config: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile(
            "instances/stack-instance.nominalcase.mysinominalcase.json",
            "stackdefinitions/stack-definition.nominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml");

        testUtil.commit(" [dry-run] trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..] docker-compose.nominalcase.yml [..] docker-compose.intermediate.mysinominalcase.yml __for mysinominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mysinominalcase.yml mysinominalcase __for mysinominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


};
