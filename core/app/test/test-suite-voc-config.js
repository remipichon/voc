var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    simple_stack_instance_docker_composes__non_remote_without_context_with_parameters__trigger_via_do_all: function () {

        testUtil.prepare();

       testUtil.copyGitAddFile(
           "instances/simple-stack-instance.withparameters.mywithparameters.json",
           "dockercomposes/docker-compose.withparameters.yml"
       );

       testUtil.commit("[dry-run] [do-all]");

       testUtil.run();

       if (testUtil.assertTextInFile("job-result/docker-compose.intermediate.mywithparameters.yml", "image: given_image_value")) {

       } else {
           throw new TestCaseError(__test_case_name_1);
       }
    },

};
