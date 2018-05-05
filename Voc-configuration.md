# VOC configuration

Following will explain you how to create configuration as code that is understood by VOC. 


# Intro
VOC uses convention over configuration. In particular, be careful to the file naming as VOC uses a precise convention
to find which files are related to each others. You will encounter two type of files
* Docker related files (Dockerfile, Docker Compose file)
* configuration files (any *.json)

Updating one of the file (Docker related or conf) will trigger the process (build or deploy). 

# Image

Two files per image
* Dockerfile.\<image-reference\>
* image.\<image-reference\>.json

> \<image-reference\> is not use to tag the image to make it more flexible but we encourage you to have a relevant \<image-name\> for logging and feedback purposes.

Two actions are available
* build from source
* push to registry 

## Dockerfile.\<image-reference\>

Regular Dockerfile, see Docker docs.

## image.\<image-reference\>.json

````json
{
  "tag": "alpinette",
  "push": "registry:5000/alpinette",
  "context": "relative/path/to/context",
}
````
* tag
 * mandatory
 * built image will be tagged with the 'tag' value  
* push
 * non mandatory
 * built image will be pushed to the 'push' value, it has to be a valid Docker Registry
 * currently not supporting 'docker login' nor unsecure registry
* context
 * relative path from where **configuration** file is found
 * should be a valid Dockefile context, it will be given as PATH to [Docker build](https://docs.docker.com/engine/reference/commandline/build/#usage)


> For remote repo, see common section [Repos](#Repos) 


# Stack 

Two kind of stacks are available:
* simple stack instance
* stack instance

Stack instance refers to a stack definition which refers to one or several docker composes. Simple Stack instance only refers to one docker compose. 


## Simple Stack Instance

Two files per simple stack
* docker-compose.\<compose-name\>.yml
* simple-stack-instance.\<compose-name\>.\<stack-name\>.yml

The simple-stack-instance refers to a single compose file via \<compose-name\>. VOC will use the 
single docker-compose file to build (if it has any 'build' attribute) and deploy the stack under the name \<stack-name\>.

### docker-compose.\<compose-name\>.yml
Regular Dockercompose file, see Docker Compose docs.

### simple-stack-instance.\<compose-name\>.\<stack-name\>.yml
````json
{
   "enabled": true|false,
   "parameters": {
       "name": "ENV name",
       "value": "value for it"
   } 
}
````
* enable
 * mandatory, true or false
 * deploy or remove a stack
* parameters
 * regular parameter for [Substituting environment variables in Compose files](https://docs.docker.com/compose/environment-variables/)
 * name: the ${NAME} in docker compose file
 * value: you can guess it...

## Stack Instance and Stack Definition

Files for stack
* a set of docker-compose.\<compose-name\>.yml
* stack-definition.\<stack-definition-name\>.json
* stack-instance.\<compose-name\>.\<stack-name\>.yml

The stack-instance refers to a single stack definition via \<stack-definition-name\>. VOC will read the stack-definition configuration and use all specified 
docker-composes to build (if any has any 'build' attribute) and deploy the stack under the name \<stack-name\>.

### docker-compose.\<compose-name\>.yml

Regular Dockercompose file, see Docker Compose docs.

### stack-definition.\<stack-definition-name\>.json
````json
{
    "composes": [
        "docker-compose.anycomposename.yml",
        "anycomposename"
    ]   
}
````
* composes
  * mandatory
  * list docker composes, can be full file name or just compose name

### stack-instance.\<compose-name\>.\<stack-name\>.yml
````json
{
   "enabled": true|false,
   "parameters": {
     "name": "ENV name",
     "value": "value for it"
   } 
}
````
* enable
 * mandatory, true or false
 * deploy or remove a stack
* parameters
 * regular parameter for [Substituting environment variables in Compose files](https://docs.docker.com/compose/environment-variables/)
 * name: the ${NAME} in docker compose file
 * value: you can guess it...
 

# Remote mode

Full local

Code on remote

Code on remote

Deploy to local

Deploy to remote


any combinaition you want


TODO
VOC can pull your repository to build or deploy from it. 

several remote mode

remote-repo: build time: code and Docker related are on remote repo

remote-host: deploy time: Docker is somwhere remotely


## [docker-and-code-on-remote-repo]

When you want to configure VOC around an existing repo which contains Dockerfile/docker-compose and code while VOC configuration sit on a VOC local repo (VOC Gitlab). 
* on VOC Gitlab repo: Image configSI, SSI, SD, **repo.\<repo-name\>.json**
* on remote repo: Dockerfiles, docker-compose files, your code
  



### repo.\<repo-name\>.json
```json
{
  "url": "ssh://root@hostname/a-remote-repo",
  "credential": "VOC_CONF_KEY"
}
```
* url
  * mandatory
  * regular Git Ssh URL
* credential
  * mandatory
  * ENV var storing the private key to access Git repo, best way is to way [Gitlab Secret](http://docs.gitlab.com/ce/ci/variables/README.html#secret-variables)
 


### host-file

Not implemented yet



# Important notice

Where the files are matters only for the relative path. File names should be unique independently from their path . (/path/to/file and /pathto/file is not accepted)

dc-name: docker compose name, should define what's in the compose file
sd-name: stack definition name, should define what does provide the stack
si-name: stack instance name, used by docker stack deploy
suffix: for instance only, optional, can be used to have more than one stack with same name. Each stack should be deployed in separate swarm of course (docker will not allow a second stack, you will get the error from docker itself)
git doesn't work when moving file as diff tree gives D and A for the same file, VOC is confusing and try to delete and add the same thing
all xx-name and suffix should match [a-zA-Z0-9_-]+


# Triggers

There is two ways to trigger a build/deploy/remove:
* updating files
* commit actions

## Updating files

Whenever a VOC configuration file or a Docker related file or a file in any contexts is commit, VOC will trigger the related actions. 
Any contexts means any directories referenced by configuration ('context' in image config) or regular contexts in 'build' attribute of docker-composes.
Related actions means:
* image config or Dockerfile or context for image changed: VOC will build and deploy (if image has push option)
* simple stack instance or stack instance config file changed: VOC will build (if related docker-compose files have 'build; attribute) and deploy the stack
* stack definition config file changed: VOC will build and deploy any stack instance relying on this stack definition
* docker-compose file changed: VOC will rebuild and redeploy any directly related Simple Stack Instance and any Stack Definition that use this docker compose (and thus, any Stack instance relying on the trigger Stack Definition) 

In remote-repo mode, Docker related files and context are in repo repo. VOC only watches local repo which has only VOC configuration file and thus will trigger actions only when those files are updated.
VOC doesn't trigger anything when remote repo changes (is has currently no way of knowing it).


## Commit Actions

Several actions are available via commit message. Commit actions are prior to changed files (git message prior over git payload) and work the same regardless of the mode (local-repo or remote-repo or remote-host). 

* dryRun: [dry-run] do as much as possible without executing any Docker related commands, prints the cmds as result.json (still generate intermediate compose file)
* doAll or buildDeployAll: [do-all] or [build-deploy-all] build and push (if push defined) all images + build (if context defined) and deploy all Simple Stack Instances and Stack Instances (if enabled)
  * buildAll: [build-all] build all images + build (if context defined) all Simple Stack Instances and Stack Instances 
    * deployAll: [deploy-all]  push (if push defined) all images + deploy all Simple Stack Instances and Stack Instances (if enabled)
      * removeAll: [remove-all] remove all Simple Stack Instances and Stack Instances
         * buildResourceName: [build-\<resource-name\>] build image or Simple Stack Instances or Stack Instances 
         * deployInstanceName: [deploy-\<instance-name\>] push image or deploy Simple Stack Instances or deploy Stack Instances 
         * removeInstanceName: [remove-\<instance-name\>] remove Simple Stack Instances or Stack Instances

Above hierarchy is used. If a '[do-all]' is found, it will not ready any further actions. same for '[build-all]', 'deployAll' and 'removeAll' in that order. Instance specific actions can be grouped in one commit message (if not other common action defined of course)
'[dry-run]' can be combined with them all. The order in the commit message is not used.


































































