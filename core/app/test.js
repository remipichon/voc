var utils = require("./utils");
var YAML = require('yamljs');


function testIsResourceFile() {
    console.log("testing isResourceFile");


    console.log("unit test getResourceName")
    console.log("docker-compose_valid.yml", "\t=>\t", utils.getResourceName(utils.resourceTypeRegex.dockercompose, "docker-compose_valid.yml"));
    console.log("docker-compose_valid_config.json", "\t=>\t", utils.getResourceName(utils.resourceTypeRegex.stackconfig, "docker-compose_valid_config.json"));
    console.log("Dockerfile_valid", "\t=>\t", utils.getResourceName(utils.resourceTypeRegex.dockerfile, "Dockerfile_valid"));
    console.log("Dockerfile_valid_config.json", "\t=>\t", utils.getResourceName(utils.resourceTypeRegex.imageconfig, "Dockerfile_valid_config.json"));


    var item = [
        "/path/to/file/docker-compose_valid.yml",
        "docker-compose_valid.yml",
        "docker-compose_nonvalid.ym",
        "docker-compose_non_valid.yml",
        "docker-compose_nonvalid.ymlZ",

        "docker-compose_valid_config.json",
        "docker-compose_non_valid_config.json",
        "docker-compose_nonvalid_config",
        "docker-compose_nonvalid_config",

        "Dockerfile",
        "Dockerfile_",
        "Dockerfile_valid",
        "dockerfile_nonvalid",

        "Dockerfile_valid_config.json",
        "Dockerfile_nonvalid_config",
        "Dockerfile_nonvalidconfig.json",
    ];

    console.log("test file name \t\t\t\t is valid \t\t resource type \t\t resource name");
    item.forEach(item => {
        let typeAndResourceName = utils.getTypeAndResourceName(item);
        if (typeAndResourceName)
            console.log(item, "\t\t", utils.isResourceFile(item), "\t\t", typeAndResourceName.type, typeAndResourceName.name);
        else
            console.log(item, "\t\t", utils.isResourceFile(item));
    })


}


function testWalk(){
    utils.walkResourceFile("/app", function(err,res){console.log(res)})
}


function testYAML(){
    console.log(YAML.load("docker-compose_stackwithcontext.yml").services);
        YAML.load("docker-compose_stackwithcontext.yml").services.forEach(s => {
        console.log(s.build);
    })
}


"/ // /".replace()


//testYAML()

//testWalk()

// testIsResourceFile();
// testIsResourceFile();