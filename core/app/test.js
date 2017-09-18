var utils = require("./utils");


function testIsResourceFile(){
    console.log("testing isResourceFile");

    var item = [
        "docker-compose_nonvalid.ym",
        "docker-compose_valid.yml",
        "docker-compose_non_valid.yml",
        "docker-compose_nonvalid.ymlZ",

        "docker-compose_valid_config.json",
        "docker-compose_non_valid_config.json",
        "docker-compose_nonvalid_config",
        "docker-compose_nonvalid_config",

        "Dockerfile_",
        "Dockerfile_valid",
        "dockerfile_nonvalid",

        "Dockerfile_valid_config.json",
        "Dockerfile_nonvalid_config",
        "Dockerfile_nonvalidconfig.json",
    ];

    item.forEach(item => {
        console.log(item, utils.isResourceFile(item), utils.getTypeAndResourceName(item));
    })


}



testIsResourceFile();