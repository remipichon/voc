var utils = require("./utils");
//var YAML = require('yamljs');


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


function testGitCmd(){
    var repoFolder = "/Users/pichr1/work2/voc-configuration/";

    //TODO get the status AMD !!!
    var modifiedFiles = "cd " + repoFolder + "; git diff-tree --stat --no-commit-id $(git rev-parse HEAD)"

    utils.execCmd(modifiedFiles, function (error, stdout) {
        if (stdout) {
            let allLines = stdout.split("\n") //I couldn't do it by Regexp

            let files = [];
            let fileChangedCount;

            allLines.forEach(line => {
                var fileMatch = /^\s+([^\s]+)\s+\|\s+.+$/m.exec(line);      //match  path/to/file    |   24 ++--
                if(!fileMatch) {
                    console.log(line, "is not a file");

                    var summaryMatch = /^\s+(\d) files changed/m.exec(line);  //match 24 files changed, 24 insertions...
                    if(summaryMatch){
                        console.log("but it was the summary",summaryMatch[1],"files has been changed")
                        fileChangedCount = summaryMatch[1];
                    }
                }
                else {
                    console.log("match for", line, "is", fileMatch[1]);
                    files.push(fileMatch[1]);
                }

            })

            console.log("*****************");
            console.log("Git diff tree result");
            if(fileChangedCount != files.length){
                console.warn(`${files.length} files has been found but ${fileChangedCount} should have been found`);
            }
            console.log("All files found");
            console.log(files)

        }

    })

}

//console.log(utils.isResourceFile(("stackwithcontext/marseille/Dockerfile-marseille")))

//testGitCmd();

//testYAML()

//testWalk()

// testIsResourceFile();
// testIsResourceFile();