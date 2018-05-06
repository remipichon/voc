var testUtil = require("./testUtil");
var TestCaseError = require("./TestCaseError");

module.exports = {


    _prepareForPerResourceCommitActions: function(){
        testUtil.prepare();

        testUtil.copyGitAddFile(
            "images/image.nominalcase.json", "images/Dockerfile.nominalcase",
            "instances/simple-stack-instance.nominalcase.mynominalcase.json", "dockercomposes/docker-compose.nominalcase.yml",
            "instances/stack-instance.nominalcase.mysinominalcase.json", "stackdefinitions/stack-definition.nominalcase.json", "dockercomposes/docker-compose.nominalcase.yml"
            );
    },

    commit_action__non_remote_without_context__build_all: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [build-all]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                //image
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                //SI
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                //SSI
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mysinominalcase.yml __for mysinominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mysinominalcase.yml __for mysinominalcase __once",
            )) throw new TestCaseError(__test_case_name_1 );


    },

    commit_action__non_remote_without_context__deploy_all: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [deploy-all]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                //image
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
                //SI
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
                //SSI
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mysinominalcase.yml __for mysinominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mysinominalcase.yml mysinominalcase __for mysinominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__remove_all: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [remove-all]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                //image removing is not implemented yet
                //SI
                "docker stack rm [..] mynominalcase __for mynominalcase __once",
                //SSI
                "docker stack rm [..] mysinominalcase __for mysinominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

    commit_action__non_remote_without_context__build_deploy_all: function () {

        this._prepareForPerResourceCommitActions();

        testUtil.commit("[dry-run] [build-deploy-all]");

        testUtil.run();

        if (!testUtil.assertExhaustive(
                //image
                "docker build [..] Dockerfile.nominalcase [..] nominalcase __for nominalcase __once",
                "docker push registrytopush:5000/nominalcase __for registrytopush:5000/nominalcase __once",
                //SI
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mynominalcase.yml __for mynominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mynominalcase.yml mynominalcase __for mynominalcase __once",
                //SSI
                "Successfully config [..]  docker-compose.nominalcase.yml [..] docker-compose.intermediate.mysinominalcase.yml __for mysinominalcase __once",
                "docker-compose [..] build [..] docker-compose.intermediate.mysinominalcase.yml __for mysinominalcase __once",
                "docker stack deploy [..] docker-compose.intermediate.mysinominalcase.yml mysinominalcase __for mysinominalcase __once",
            )) throw new TestCaseError(__test_case_name_1);


    },

}



























































