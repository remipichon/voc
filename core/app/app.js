var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var stream = require('stream');
var http = require('http');

require("dockerode/package.json"); // dockerode is a peer dependency.
var Docker = require('dockerode');
var DockerEvents = require('docker-events');
var docker = new Docker({socketPath: '/var/run/docker.sock'});

console.log("Starting...");

docker.createContainer({
    Image: 'nginx:alpine-perl',
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    OpenStdin: false,
    StdinOnce: false,
    "ExposedPorts": {
        "80/tcp": { }
    },
    "HostConfig": {
        "PortBindings": { "80/tcp": [{ "HostPort": "8080" }] },
    }
},function(err,container){
    if(err) console.log(err);
    container.start(function (err, data) {
    });
});















/**
 * Get logs from running container
 */
function containerLogs(container) {

    // create a single stream for stdin and stdout
    var logStream = new stream.PassThrough();
    logStream.on('data', function(chunk){
        console.log(chunk);
    });

    container.logs({
        follow: true,
        stdout: true,
        stderr: true
    }, function(err, stream){
        if(err) {
            return logger.error(err.message);
        }
        container.modem.demuxStream(stream, logStream, logStream);
        stream.on('end', function(){
            logStream.end('!stop!');
        });
    });
    return container;
}

function runWkhtmltopdfContainer(outputFile,url){

    docker.createContainer({
        Image: 'assomaker/wkhtmltopdf',
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: false,
        StdinOnce: false,
        Name: outputFile,
        "HostConfig": {
            "NetworkMode": NetworkMode,
            "Binds":[ouputDir+":/root/out"]

        },
        "Labels": {
            "outputFile": outputFile
        },
        "Volumes":{"/root/out": {}},
        Env: [
            'IN='+url,
            'OUT=/root/out/'+outputFile
        ],
    },function(err,container){
        container.start(function (err, data) {
        });
    });

}


var emitter = new DockerEvents({
    docker: new Docker({socketPath: '/var/run/docker.sock'})
});


emitter.on("start", function(message) {
    if(message && message.Actor && message.Actor.Attributes && message.Actor.Attributes.outputFile){
        var outputFile = message.Actor.Attributes.outputFile
        console.log("container started: %j", outputFile);
    }
});

emitter.on("stop", function(message) {
    if(message && message.Actor && message.Actor.Attributes && message.Actor.Attributes.outputFile){
        var outputFile = message.Actor.Attributes.outputFile
        console.log("container stopped: %j", outputFile);
    }
});

emitter.on("die", function(message) {
    if(message && message.Actor && message.Actor.Attributes && message.Actor.Attributes.outputFile){
        var outputFile = message.Actor.Attributes.outputFile
        console.log("container died: %j", outputFile);
    }
});

emitter.on("destroy", function(message) {
    if(message && message.Actor && message.Actor.Attributes && message.Actor.Attributes.outputFile){
        var outputFile = message.Actor.Attributes.outputFile
        console.log("container destroyed: %j", outputFile);
    }
});

emitter.start();