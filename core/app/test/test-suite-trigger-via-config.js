var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    image__dry_run_do_all__non_remote_without_context__trigger_via_config: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile("images/image.nominalcase.json", "images/Dockerfile.nominalcase");

        testUtil.commit(" trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_docker_composes__dry_run_do_all__non_remote_without_context__trigger_via_config: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile(
            "instances/simple-stack-instance.nominalcase.mynominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml"
        );

        testUtil.commit(" trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    stack_instance_stack_definition_docker_compose__dry_run_do_all__non_remote_without_context__trigger_via_config: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile(
            "instances/stack-instance.nominalcase.mynominalcase.json",
            "stackdefinitions/stack-definition.nominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml");

        testUtil.commit(" trigger via config and Docker related files ");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..] docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


};
