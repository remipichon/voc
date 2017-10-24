var utils = require("./utils");
//var YAML = require('yamljs');
var _ = require("underscore");
var fsService = require("./fsService");
var fsUtil = require("./fsUtil");
var resourceUtil = require("./resourceUtil");



function testIsResourceFile() {
    console.log("testing isResourceFile");

    var item = [
        "simple-stack-instance.stackwithcontext.mystackwithcontext.json",
        "stack-instance.webstuff-stackwithcontext.mywebstuffstackwithcontext.json",
        "docker-compose.webstuff.yml",
        "stack-definition.webstuff-stackwithcontext.json"
    ];

    console.log("is valid \t\t resource type \t\t resource name \t\t resource suffix \t\t resource soulmate");
    item.forEach(item => {
        let typeAndResourceName = resourceUtil.getTypeAndResourceName(item);
        if (typeAndResourceName)
            console.log(item, "\n", resourceUtil.isResourceFile(item), "\t", typeAndResourceName.type, "\t",typeAndResourceName.name, "\t",typeAndResourceName.suffix, "\t",typeAndResourceName.soulMate);
        else
            console.log(item, "\n", resourceUtil.isResourceFile(item));
    })


}


async function testWalk(){

    // console.log("****************************async")
    // utils.walkResourceFile("/Users/pichr1/work2/voc/core/app", function(err,res){console.log("final res",res)})

    // console.log("*****************************promise")
    // utils.walkResourceFilePromise("/Users/remi/work/voc-configuration").then((allPaths) => {
    //     console.log("allpath",allPaths)
    // }).catch(error => console.error("error",error));
    //
    // console.log("end of method");


    console.log("avant");
    var res = await fsService.walkResourceFilePromise("/app/pouet")
    console.log("rest",res);
    console.log("apres")

    return res;

}

function testWalkSync(){

    // console.log("****************************async")
    // utils.walkResourceFile("/Users/pichr1/work2/voc/core/app", function(err,res){console.log("final res",res)})

    // console.log("*****************************promise")
    // utils.walkResourceFilePromise("/Users/remi/work/voc-configuration").then((allPaths) => {
    //     console.log("allpath",allPaths)
    // }).catch(error => console.error("error",error));
    //
    // console.log("end of method");


    var res = fsUtil.walkResourceFileSync("/voc-configuration/")
    console.log("res",res);


    return res;

}


function testYAML(){
    console.log(YAML.load("docker-compose_stackwithcontext.yml").services);
        YAML.load("docker-compose_stackwithcontext.yml").services.forEach(s => {
        console.log(s.build);
    })
}


function testGitCmd(){
    var repoFolder = "/Users/pichr1/work2/voc-configuration/";

    var modifiedFiles = "cd " + configuration.repoFolder + "; git diff-tree --no-commit-id --name-status -r $(git rev-parse HEAD)"

    utils.execCmd(modifiedFiles, function (error, stdout) {
        if (stdout) {
            let allLines = stdout.split("\n") //I couldn't do it by Regexp

            let files = [];
            let fileChangedCount;

            allLines.forEach(line => {
                var fileMatch = /^([ACDMRTUXB])\s+([^\s]+)$/m.exec(line);      //match  type    path/to/file
                //console.log(fileMatch);
                if(fileMatch) {
                    console.log("match for ==", line, "== is", fileMatch[2],"which has been",fileMatch[1]);
                    files.push({file: fileMatch[2], status: fileMatch[1]});
                }

            })

            console.log("*****************");
            console.log("Git diff tree result");
            console.log("All files found");
            console.log(files)

        }

    });

}


function testCmdSync(){
    console.log("start")
    let stdout = utils.execCmdSync("lsee", true);
    console.log("cmd result",stdout);
    console.log("end")
}


// testCmdSync();


//console.log(utils.isResourceFile(("stackwithcontext/marseille/Dockerfile-marseille")))

//testGitCmd();
// testGitCmd();

//testYAML()

// var tr = testWalk()
// console.log("apres apres",tr);

var tr = testWalkSync()

// testIsResourceFile();
// testIsResourceFile();