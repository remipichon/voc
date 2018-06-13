var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

  image__non_remote_without_context_with_parameters__trigger_via_do_all: function () {

    testUtil.prepare();

    testUtil.copyGitAddFile(
      "images/image.withparameters.json",
      "images/Dockerfile.withparameters"
    );

    testUtil.commit("[dry-run] [do-all]");

    testUtil.run();

    if (testUtil.assert("docker build [..] --build-arg coolBaseImage=this_is_base __for withparameters __once")) {

    } else {
      throw new TestCaseError(__test_case_name_1);
    }
  },

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

  image__non_remote_without_context_with_parameters_env__trigger_via_do_all: function () {

    testUtil.prepare();

    testUtil.copyGitAddFile(
      "images/image.withparametersenv.json",
      "images/Dockerfile.withparametersenv"
    );

    testUtil.commit("[dry-run] [do-all]");

    process.env["COOL_BASE"] = "this_is_base";
    testUtil.run();

    if (testUtil.assert("docker build [..] --build-arg coolBaseImage=this_is_base __for withparametersenv __once")) {

    } else {
      throw new TestCaseError(__test_case_name_1);
    }
  },

  simple_stack_instance_docker_composes__non_remote_without_context_with_parameters_env__trigger_via_do_all: function () {

    testUtil.prepare();

    testUtil.copyGitAddFile(
      "instances/simple-stack-instance.withparameters.mywithparametersenv.json",
      "dockercomposes/docker-compose.withparameters.yml"
    );

    process.env["COOL_BASE"] = "given_image_value";
    testUtil.commit("[dry-run] [do-all]");

    testUtil.run();

    if (testUtil.assertTextInFile("job-result/docker-compose.intermediate.mywithparametersenv.yml", "image: given_image_value")) {

    } else {
      throw new TestCaseError(__test_case_name_1);
    }
  },



  simple_stack_instance_disabled__non_remote_without_context__trigger_via_do_all: function () {

    testUtil.prepare();

    testUtil.copyGitAddFile(
      "instances/simple-stack-instance.nominalcase.mydisablednominalcase.json",
      "dockercomposes/docker-compose.nominalcase.yml"
    );

    testUtil.commit("[dry-run] [do-all]");

    testUtil.run();

    //It's debatable, should we generate intermediate compose file when deleting the stack?
    if (testUtil.assertExhaustive(
        "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mydisablednominalcase.yml __for mydisablednominalcase __once",
        "docker stack rm [..] mydisablednominalcase __for mydisablednominalcase __once",
      )) {

    } else {
      throw new TestCaseError(__test_case_name_1);
    }
  },

};
