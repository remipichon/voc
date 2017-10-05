var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

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

