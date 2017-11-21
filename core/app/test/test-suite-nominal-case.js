var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    //making sure dry and do all are working
    commit_action__non_remote_without_context__trigger_via_do_all: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile("images/image.testdryrun.json", "images/Dockerfile.testdryrun");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert("Dry run __for testdryrun __all")) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    image__non_remote_without_context__trigger_via_do_all: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile("images/image.nominalcase.json", "images/Dockerfile.nominalcase");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    simple_stack_instance_docker_composes__non_remote_without_context__trigger_via_do_all: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile(
            "instances/simple-stack-instance.nominalcase.mynominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml"
        );

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },

    stack_instance_stack_definition_docker_compose__non_remote_without_context__trigger_via_do_all: function () {

        testUtil.prepare();

        testUtil.copyGitAddFile(
            "instances/stack-instance.nominalcase.mynominalcase.json",
            "stackdefinitions/stack-definition.nominalcase.json",
            "dockercomposes/docker-compose.nominalcase.yml");

        testUtil.commit("[dry-run] [do-all]");

        testUtil.run();

        if (testUtil.assert(
                "Successfully config [..] docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) {

        } else {
            throw new TestCaseError(__test_case_name_1);
        }
    },


};
