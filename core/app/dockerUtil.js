var _ = require("underscore");
require("dockerode/package.json"); // dockerode is a peer dependency.
var Docker = require('dockerode');
var docker = new Docker({socketPath: '/var/run/docker.sock'});
var configuration = require("./configuration");

var curlUnixDockerSocket = 'curl --unix-socket /var/run/docker.sock '
var requestDockerApiVersion = ' http:/v1.30/';

module.exports = {


};