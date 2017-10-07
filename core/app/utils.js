var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var fs = require('fs');

module.exports = {


    execCmd: function (cmd, callback, printStdout = false) {
        exec(cmd, function (error, stdout, stderr) {
            // command output is in stdout
            if (error) console.error("error", error);
            if(printStdout)
                console.log(`cmd ${cmd} stdout is\n${stdout}`);
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

    //for circular dependencies reasons TODO fix that
    readFileSyncToJson: function(path){
        var data;
        try {
            data = fs.readFileSync(path, {encoding: 'utf-8'});
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.error("File not found " + path);
                throw err;
            } else {
                console.error("Error while reading file:", err);
                throw err;
            }
        }
        let json = JSON.parse(data);
        if(!json){
            throw new Error(`Error while reading json file at ${path}`);
        }
        return json;
    }


};

