var log = require('loglevel');
var utils = require("./utils");
//var YAML = require('yamljs');
var _ = require("underscore");
var fsUtil = require("./fsUtil");
var resourceUtil = require("./resourceUtil");



function testIsResourceFile() {
    log.log("testing isResourceFile");

    var item = [
        "simple-stack-instance.stackwithcontext.mystackwithcontext.json",
        "stack-instance.webstuff-stackwithcontext.mywebstuffstackwithcontext.json",
        "docker-compose.webstuff.yml",
        "stack-definition.webstuff-stackwithcontext.json"
    ];

    log.log("is valid \t\t resource type \t\t resource name \t\t resource suffix \t\t resource soulmate");
    item.forEach(item => {
        let typeAndResourceName = resourceUtil.getTypeAndResourceName(item);
        if (typeAndResourceName)
            log.log(item, "\n", resourceUtil.isResourceFile(item), "\t", typeAndResourceName.type, "\t",typeAndResourceName.name, "\t",typeAndResourceName.suffix, "\t",typeAndResourceName.soulMate);
        else
            log.log(item, "\n", resourceUtil.isResourceFile(item));
    })


}




function testWalkSync(){

    // log.log("****************************async")
    // utils.walkResourceFile("/Users/pichr1/work2/voc/core/app", function(err,res){log.log("final res",res)})

    // log.log("*****************************promise")
    // utils.walkResourceFilePromise("/Users/remi/work/voc-configuration").then((allPaths) => {
    //     log.log("allpath",allPaths)
    // }).catch(error => log.error("error",error));
    //
    // log.log("end of method");


    var res = fsUtil.walkResourceFileSync("/voc-configuration/")
    log.log("res",res);


    return res;

}


function testYAML(){
    log.log(YAML.load("docker-compose_stackwithcontext.yml").services);
        YAML.load("docker-compose_stackwithcontext.yml").services.forEach(s => {
        log.log(s.build);
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
                //log.log(fileMatch);
                if(fileMatch) {
                    log.log("match for ==", line, "== is", fileMatch[2],"which has been",fileMatch[1]);
                    files.push({file: fileMatch[2], status: fileMatch[1]});
                }

            })

            log.log("*****************");
            log.log("Git diff tree result");
            log.log("All files found");
            log.log(files)

        }

    });

}


function testCmdSync(){
    log.log("start")
    let stdout = utils.execCmdSync("lsee", true);
    log.log("cmd result",stdout);
    log.log("end")
}

function multipleParam(...trucs){
    log.log(trucs)
}

// multipleParam("1","haha");


log.log(utils.execCmdSync("ls",false, {cwd: "node_modules"}));


// testCmdSync();


//log.log(utils.isResourceFile(("stackwithcontext/marseille/Dockerfile-marseille")))

//testGitCmd();
// testGitCmd();

//testYAML()

// var tr = testWalk()
// log.log("apres apres",tr);

// var tr = testWalkSync()

// testIsResourceFile();
// testIsResourceFile();