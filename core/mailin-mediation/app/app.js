'use strict';

/**
 * Start Mailin server. Redirect mail according to recipient.
 * <service>@your.mail.host.name
 * read in ENV for <SERVICE> and POST data to the defined endpoint
 */

var async = require('async');
var express = require('express');
var fs = require('fs');
var multiparty = require('multiparty');
var util = require('util');
var execSync = require('child_process').execSync;
var request = require('request');


/* Make an http server to receive the webhook. */
var server = express();

server.get('/',function(req, res){
    res.send("GET /env to know the defined webhook, POST /mediation mail payload and attachment as multipart field form to trigger mediation");
});

server.get('/env',function(req, res){
    var env = execSync("env").toString();
    console.log("env",env);
    res.send(env);
});

server.head('/mediation', function (req, res) {
    console.log('Received head request from webhook.');
    res.sendStatus(200);
});


server.post('/mediation', function (req, res) {
    console.log('Receiving webhook.');

    /* Respond early to avoid timouting the mailin server. */
    // res.send(200);

    /* Parse the multipart form. The attachments are parsed into fields and can
     * be huge, so set the maxFieldsSize accordingly. */
    var form = new multiparty.Form({
        maxFieldsSize: 70000000
    });

    form.on('progress', function () {
        var start = Date.now();
        var lastDisplayedPercentage = -1;
        return function (bytesReceived, bytesExpected) {
            // var elapsed = Date.now() - start;
            // var percentage = Math.floor(bytesReceived / bytesExpected * 100);
            // if (percentage % 20 === 0 && percentage !== lastDisplayedPercentage) {
            //     lastDisplayedPercentage = percentage;
            //     console.log('Form upload progress ' +
            //         percentage + '% of ' + bytesExpected / 1000000 + 'Mb. ' + elapsed + 'ms');
            // }
        };
    }());

    form.parse(req, function (err, fields) {
        console.log("received form");
        // console.log(util.inspect(fields, {
        //     depth: 1
        // }));

        var mailinMsg = JSON.parse(fields.mailinMsg);

        var recipient = mailinMsg.to[0].address;
        var split = recipient.split('@')
        var name = split[0]
        var hostname = split[1] //mail.remip.eu
        if(readEnv("AUTHORIZED_MAIL_HOST") && hostname != readEnv("AUTHORIZED_MAIL_HOST")){
            console.error("Mail was not for hostname", readEnv("AUTHORIZED_MAIL_HOST"))
        }
        console.log("Received mail destinated to",name);
        var webhook = readEnv(name.toUpperCase());
        var type = readEnv(name.toUpperCase() + "_TYPE");
        var attachmentEncoding = readEnv(name.toUpperCase() + "_ENCODING");
        if(!webhook){
            webhook = readEnv(name.toLowerCase());
            type = readEnv(name.toLowerCase() + "_TYPE");
            attachmentEncoding = readEnv(name.toLowerCase() + "_ENCODING");
        }
        if(!webhook){
            webhook = readEnv(name);
            type = readEnv(name + "_TYPE");
            attachmentEncoding = readEnv(name + "_ENCODING");
        }
        if(!webhook){
            console.log("Webhook for",name,"wasn't found in ENV using",name.toUpperCase(),name.toLowerCase(),name,"Skipping process");
            res.sendStatus(403);
            return;
        }
        if(!type){
            console.log("Type for",name,"wasn't found in ENV using",name.toUpperCase(),name.toLowerCase(),name,"using default 'field");
            type = "field"
        }
        if(!attachmentEncoding){
            console.log("attachmentEncoding for",name,"wasn't found in ENV using",name.toUpperCase(),name.toLowerCase(),name,"using default 'null'");
            attachmentEncoding = null;
        }

        //console.log('Parsed fields: ' + Object.keys(fields));
        //console.log('mailinMsg fields: ' + Object.keys(mailinMsg));

        if(!webhook.startsWith("http://"))
            webhook = "http://" + webhook;

        console.log("Mail will be POSTed to ",webhook, "with type", type);
        res.sendStatus(200);


        if(type == "field") {
            postTextField(webhook, mailinMsg, fields);
        }


        if(type == "file") {
            var prefix = mailinMsg.connection.id;
            console.log("Write down the payload and the attachments with prefix",prefix);

            async.auto({
                writeParsedMessage: function (cbAuto) {
                    console.log("Writting",prefix +'_mailinMsg.json');
                    fs.writeFile(prefix +'_mailinMsg.json', fields.mailinMsg, cbAuto);
                },
                writeAttachments: function (cbAuto) {
                    async.eachLimit(mailinMsg.attachments, 3, function (attachment, cbEach) {
                        console.log("Writting", prefix +'_' + attachment.generatedFileName, "using encoding",attachmentEncoding, "(see https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback to know what encoding means)");
                        if(attachmentEncoding && attachmentEncoding != "") fs.writeFile(prefix +'_' + attachment.generatedFileName, fields[attachment.generatedFileName], attachmentEncoding, cbEach);
                        fs.writeFile(prefix +'_' + attachment.generatedFileName, fields[attachment.generatedFileName],cbEach);
                    }, cbAuto);
                }
            }, function (err) {
                if (err) {
                    console.error(err.stack);
                    console.error("Unable to write files for", webhook,"from", mailinMsg.from[0].address,"Skipping process");
                } else {
                    console.log("Webhook payload written for", webhook,"from", mailinMsg.from[0].address);
                    postFile(webhook, prefix, mailinMsg);
                }
            });
        }
    });
});

//equivalent of curl -F TestFile="<temp" -F mailinMsg="<mailinMsg.json"  "localhost:3200/webhook"
function postTextField (webhook, mailinMsg, fields) {
    console.log("POST as field to", webhook,"from",mailinMsg.from[0].address);
    request.post({url: webhook, formData: fields},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("200 POST to", webhook, body)
            } else if (!error) {
                console.warn(response.statusCode, "POST to", webhook, body)
            }
            if (error) {
                console.error("error", error);
                console.error("response", response);
                console.error("body", body);

            }
        }
    );
}


//equivalent of curl -F TestFile="@temp" -F mailinMsg="@mailinMsg.json"  "localhost:3200/webhook"
function postFile(webhook, prefix, mailinMsg){
    var formData = {
        mailinMsg: fs.createReadStream(prefix +'_mailinMsg.json'),
    };

    mailinMsg.attachments.forEach( function (attachment) {
        formData[attachment.generatedFileName] = fs.createReadStream(prefix +'_' + attachment.generatedFileName)
    });

    console.log("POST as file to", webhook,"from",mailinMsg.from[0].address,"with attached files", Object.keys(formData));

    request.post({
            url: webhook,
            formData: formData
        }, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                console.log("200 POST to", webhook, body)
            } else if (!err) {
                console.warn(response.statusCode, "POST to", webhook, body)
            }
            if (err) {
                console.error("error", err);
                console.error("response", response);
                console.error("body", body);

            }
            if(readEnv("DEBUG") == "true") {
                console.warn("DEBUG is true, skipping deleting files with prefix", prefix)
                return;
            }
            console.log("Deleting files with prefix",prefix);
            fs.unlink(prefix +'_mailinMsg.json')
            mailinMsg.attachments.forEach( function (attachment) {
                fs.unlink(prefix +'_' + attachment.generatedFileName)
            });
        }
    );
}


server.listen(80, function (err) {
    console.log(execSync("env").toString());
    if(!readEnv("AUTHORIZED_MAIL_HOST")){
        console.warn("Env 'AUTHORIZED_MAIL_HOST' is not defined. Mediation will not be able to assert that the emails were destined to your installation.")
    }
    if (err) {
        console.log(err);
    } else {
        console.log('Http server listening on port 80');
    }
});


function readEnv(envName){
    return process.env[envName]
}








