'use strict';

var fs = require('fs');
var _ = require("underscore");
var configuration = require("./configuration");

module.exports = {


    getState(error, stderr, stdout) {
        var state = {};
        if (error) {
            state.error = stderr + " : " + JSON.stringify(error);
        } else {
            state.result = stdout || stderr;
        }
        return state;
    }

};