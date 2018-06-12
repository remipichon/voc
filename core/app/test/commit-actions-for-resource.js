var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    _prepareForPerResourceCommitActions: function(){
        testUtil.prepare();

        testUtil.copyGitAddFile(
            "images/image.nominalcaseimage.json", "images/Dockerfile.nominalcaseimage",
            "images/image.nominal-case.json", "images/Dockerfile.nominal-case",
            "dockercomposes/docker-compose.nominalcase.yml",
            "instances/simple-stack-instance.nominalcase.mynominalcase.json", "dockercomposes/docker-compose.nominalcase.yml",
            "instances/simple-stack-instance.withcontext.mywithcontext.json", "dockercomposes/docker-compose.withcontext.yml",
            "instances/stack-instance.nominalcase.mysinominalcase.json", "stackdefinitions/stack-definition.nominalcase.json", "dockercomposes/docker-compose.nominalcase.yml"
            );
    },

    commit_action__non_remote_without_context__build_image: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [build-nominalcaseimage]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "docker build [..] Dockerfile.nominalcaseimage [..] nominalcaseimage __for nominalcaseimage __once",
            )) throw new TestCaseError(__test_case_name_1);

    },

    commit_action__non_remote_without_context__build_image_snake_name: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [build-nominal-case]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "docker build [..] Dockerfile.nominal-case [..] nominal-case __for nominal-case __once",
            )) throw new TestCaseError(__test_case_name_1);

    },

    commit_action__non_remote_without_context__pull_image: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [push-nominalcaseimage]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "docker tag [..] nominalcaseimage [..] registrytopush:5000/nominalcaseimage [..] docker push [..] nominalcaseimage __for nominalcaseimage __once",
            )) throw new TestCaseError(__test_case_name_1);

    },

  commit_action__non_remote_without_context__build_push_image: function () {

    this._prepareForPerResourceCommitActions();

    testUtil.commit("[dry-run] [build-nominalcaseimage] [push-nominalcaseimage]");

    testUtil.run();

    if (!testUtil.assertExhaustive(
        "docker build [..] Dockerfile.nominalcaseimage [..] nominalcaseimage __for nominalcaseimage __once",
        "docker tag [..] nominalcaseimage [..] registrytopush:5000/nominalcaseimage [..] docker push [..] nominalcaseimage __for nominalcaseimage __once",
      )) throw new TestCaseError(__test_case_name_1);

  },

    commit_action__non_remote_without_context__build_ssi: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [build-mynominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__deploy_ssi: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [deploy-mynominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__remove_ssi: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [remove-mynominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "docker stack rm [..] mynominalcase __for mynominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

};



























































