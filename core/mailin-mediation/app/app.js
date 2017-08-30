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
    res.send("GET /env to know the defined webhook\nPOST mail as multipart form to /mediation to trigger mediation");
});

server.get('/env',function(req, res){
    let env = execSync("env").toString();
    console.log("env",env);
    res.send(env);
});

server.head('/mediation', function (req, res) {
    console.log('Received head request from webhook.');
    res.send(200);
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
            var elapsed = Date.now() - start;
            var percentage = Math.floor(bytesReceived / bytesExpected * 100);
            if (percentage % 20 === 0 && percentage !== lastDisplayedPercentage) {
                lastDisplayedPercentage = percentage;
                console.log('Form upload progress ' +
                    percentage + '% of ' + bytesExpected / 1000000 + 'Mb. ' + elapsed + 'ms');
            }
        };
    }());

    form.parse(req, function (err, fields) {
        console.log(util.inspect(fields.mailinMsg, {
            depth: 5
        }));

        console.log('Parsed fields: ' + Object.keys(fields));

        var recipient = fields.mailinMsg.to[0].address;
        var split = recipient.split('@')
        var name = split[0]
        var hostname = split[1] //mail.remip.eu
        console.log("Received mail destinated to",name);
        var webhook = readEnv(name.toUpperCase());
        if(!webhook){
            webhook = readEnv(name.toLowerCase());
        }
        if(!webhook){
            webhook = readEnv(name);
        }
        if(!webhook){
            console.log("Webhook for",name,"wasn't found in ENV using",name.toUpperCase(),name.toLowerCase(),name,"Skipping process");
            return;
        }


        console.log("POST to",webhook);
        //POST body/attachments to endpoint webhook
        request.post(webhook,
            {
                json: {
                    from: data.from[0].address,
                    to: data.to[0].address
                }
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log("POST to",webhook,body)
                }
            }
        );




        console.log("Write down the payload for ulterior inspection.")
        async.auto({
            writeParsedMessage: function (cbAuto) {
                fs.writeFile('payload.json', fields.mailinMsg, cbAuto);
            },
            writeAttachments: function (cbAuto) {
                var msg = JSON.parse(fields.mailinMsg);
                async.eachLimit(msg.attachments, 3, function (attachment, cbEach) {
                    fs.writeFile(attachment.generatedFileName, fields[attachment.generatedFileName], 'base64', cbEach);
                }, cbAuto);
            }
        }, function (err) {
            if (err) {
                console.log(err.stack);
                res.send(500, 'Unable to write payload');
            } else {
                console.log('Webhook payload written.');
                res.send(200);
            }
        });
    });
});


server.listen(80, function (err) {
    console.log("readEnv",readEnv("TEST"));
    if (err) {
        console.log(err);
    } else {
        console.log('Http server listening on port 3000');
    }
});


function readEnv(envName){
    return process.env[envName]
}








