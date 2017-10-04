async.function(function(response) {
    foo = "bar"
    if (exists){
        foo = "foobar";
    }

    if( typeof callback == 'function' ){
        callback(foo);
    }
});

module.exports = {
    main:  function () {

        let resources = fsUtil.getAllResourceFiles();

        let contextPaths = resources.contextPaths;
        let instances = resources.instances;
        let stackDefinitions = resources.stackDefinitions;
        let dockercomposes = resources.dockercomposes;

        let triggeredInstances = gitUtil.getGitDiffModifiedFile(contextPaths, instances, stackDefinitions, dockercomposes);

        resourceUtil.triggerInstance(triggeredInstances, stackDefinitions, dockercomposes);

    }
}