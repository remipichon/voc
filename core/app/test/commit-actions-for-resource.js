var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {

    _prepareForPerResourceCommitActions: function(){
        testUtil.prepare();

        testUtil.copyGitAddFile(
            "images/image.nominalcase.json", "images/Dockerfile.nominalcase",
            "instances/simple-stack-instance.nominalcase.mynominalcase.json", "dockercomposes/docker-compose.nominalcase.yml",
            "instances/simple-stack-instance.withcontext.mywithcontext.json", "dockercomposes/docker-compose.withcontext.yml",
            "instances/stack-instance.nominalcase.mysinominalcase.json", "stackdefinitions/stack-definition.nominalcase.json", "dockercomposes/docker-compose.nominalcase.yml"
            );
    },

    commit_action__non_remote_without_context__build_image: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[build-nominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__build_ssi: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[build-mynominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__deploy_ssi: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[deploy-mynominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__remove_ssi: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[remove-mynominalcase]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                "docker stack rm [..] mynominalcase __for mynominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

};



























































