var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
// var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');
var configuration = require("./configuration");

module.exports = {


    execCmd: function (cmd, callback) {
        console.log("exec cmd", cmd);
        exec(cmd, function (error, stdout, stderr) {
            // command output is in stdout
            if (error) console.error("error", error);
            console.log(cmd, "stdout is");
            console.log(stdout);
            if (stderr) console.error("stderr", stderr);
            if (callback) callback(error, stdout, stderr)
        });
    },

    execCmdSync: function(cmd, delegateError = false){
        let stdout;
        try{
            stdout = execSync(cmd, { "encoding": "UTF-8" });
        } catch (err){
            console.error(`Error executing command ${cmd}: ${err}`);
            if(!delegateError)
                throw new Error(err);
            else
                return { error: err }
        }

        return stdout
    },





};


/* CODE SAMPLE

 READ FILE SYNC
 var data;
 try {
 data = fs.readFileSync(path, {encoding: 'utf-8'});
 } catch (err) {
 if (err.code === 'ENOENT') {
 console.log("file not found for " + path);
 } else {
 console.error(`Error while reading file ${path}:`, err);
 throw err;
 }
 }

 if(data) {
 console.log('File for\n', composeFile, "\n", data);

 var config = JSON.parse(data);
 } else {
 console.info(`Action was not performed because ${file} was not found`);
 }


 */
