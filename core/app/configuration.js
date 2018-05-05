'use strict';

module.exports = {
    repoFolder: process.env.CI_PROJECT_DIR + "/",
    remoteRepoFolder: process.env.HOME + "/remote-repo/",
    artifactDir: "job-result/",
    resultFile: "result.json",
}