var mailin = require('mailin');

/**
 * Start Mailin server. Redirect mail according to recipient.
 * <service>@your.mail.host.name
 * read in ENV for <SERVICE> and POST data to the defined endpoint
 */

/* Start the Mailin server. The available options are:
 *  options = {
 *     port: 25,
 *     webhook: 'http://mydomain.com/mailin/incoming,
 *     disableWebhook: false,
 *     logFile: '/some/local/path',
 *     logLevel: 'warn', // One of silly, info, debug, warn, error
 *     smtpOptions: { // Set of options directly passed to simplesmtp.createServer(smtpOptions)
 *        SMTPBanner: 'Hi from a custom Mailin instance'
 *     }
 *  };
 * Here disable the webhook posting so that you can do what you want with the
 * parsed message. */
mailin.start({
    smtpOptions:{
        disableDNSValidation: true
    }, // DEBUG ONLY,
    logLevel: 'DEBUG',
    port: 25,
    disableWebhook: true // Disable the webhook posting.
});

/* Access simplesmtp server instance. */
mailin.on('authorizeUser', function(connection, username, password, done) {
    if (username == "johnsmith" && password == "mysecret") {
        done(null, true);
    } else {
        done(new Error("Unauthorized!"), false);
    }
});

/* Event emitted when a connection with the Mailin smtp server is initiated. */
mailin.on('startMessage', function (connection) {
    /* connection = {
     from: 'sender@somedomain.com',
     to: 'someaddress@yourdomain.com',
     id: 't84h5ugf',
     authentication: { username: null, authenticated: false, status: 'NORMAL' }
     }
     }; */
    console.log(connection);
});

/* Event emitted after a message was received and parsed. */
mailin.on('message', function (connection, data, content) {
    console.log(data);
    /* Do something useful with the parsed message here.
     * Use parsed message `data` directly or use raw message `content`. */
    //TODO
    //read recipient <service>@mail.remip.eu
    var recipient = data.to[0].address;
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

    console.log("POST to",webhook,"TODO");
    //POST body/attachments to endpoint system.env.<SERVICE>=<endpoint>

});

function readEnv(envName){
    return process.env[envName]
}










