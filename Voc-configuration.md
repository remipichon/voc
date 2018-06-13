# VOC configuration

Following will explain you how to create configuration as code that is understood by VOC. 


# Intro

VOC knows to perform two main tasks:
* build Docker images
* deploy Docker stack 

VOC can use Docker 
* locally, it will use the same Docker where VOC (Gitlab) is running (via the Docker socket)
* remotely, it will use a remote Docker daemon (via certificates). See the __remote-host__ mode [Remote host](#Remote host)

VOC is run via a Gitlab runner which provide great features. For example it can be configured to be scheduled on some remote node. See [https://docs.gitlab.com/runner/](https://docs.gitlab.com/runner/)

VOC uses convention over configuration. In particular, be careful to the file naming as VOC uses a precise convention
to find which files are related to each others. You will encounter two type of files
* Docker related files (Dockerfile, Docker Compose file)
* configuration files (any *.json)

Commit one of the file (Docker related or conf) and VOC will trigger the right process (build or deploy or both). 

VOC is designed to work with locally hosted (on Gitlab) as well as remote repositories. See the __remote-repo__ mode [Repository Mode](#Repository Mode)

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
  "push": "registry:5000/alpinette" | ["registry:5000/alpinette:version", "registry:5000/alpinette:latest"]
  "context": "relative/path/to/context",
  "parameters": [{
       "name": "ENV name",
       "value": "value for it"
  }] 
}
````
* tag
  * mandatory
  * built image will be tagged with the 'tag' value  
* push
  * non mandatory
  * built image will be pushed to the 'push' value, it has to be a valid Docker Registry
  * it can be an array to push several remote at once (typically to push _latest_ as well as a version)
  * currently not supporting 'docker login' (has to be done in _gitlab-ci.yml_ using Gitlab secrests) nor unsecure registry
* context
  * relative path from where **dockerfile** is found, if not set, context will be where the dockerfile if found
  * should be a valid Dockefile context, it will be given as PATH to [Docker build](https://docs.docker.com/engine/reference/commandline/build/#usage)
* parameters
  * regular parameter for [Parametrized Dockerfile](https://docs.docker.com/engine/reference/builder/#arg)
  * name: the ${NAME} in Dockerfile
  * value: any string, if starting with dollar sign `$` value will be read from the host (== the Gitlab Job)

> the '$' notation allows you to work with [Gitlab Variable as well as Gitlab Secrets](https://docs.gitlab.com/ee/ci/variables/#variables)


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

> For remote repo, see common section [Repos](#Repos) 

### docker-compose.\<compose-name\>.yml
Regular Dockercompose file, see Docker Compose docs.

### simple-stack-instance.\<compose-name\>.\<stack-name\>.yml
````json
{
   "enabled": true|false,
   "parameters": [{
       "name": "ENV name",
       "value": "value for it"
   }] 
}
````
* enable
  * mandatory, true or false
  * deploy or remove a stack
* parameters
  * regular parameter for [Substituting environment variables in Compose files](https://docs.docker.com/compose/environment-variables/)
  * name: the ${NAME} in docker compose file
  * value: any string, if starting with dollar sign `$` value will be read from the host (== the Gitlab Job)

> the '$' notation allows you to work with [Gitlab Variable as well as Gitlab Secrets](https://docs.gitlab.com/ee/ci/variables/#variables)

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
   "parameters": [{
     "name": "ENV name",
     "value": "value for it"
   }] 
}
````
* enable
  * mandatory, true or false
  * deploy or remove a stack
* parameters: list
  * regular parameter for [Substituting environment variables in Compose files](https://docs.docker.com/compose/environment-variables/)
  * name: the ${NAME} in docker compose file
  * value: any string, if starting with dollar sign `$` value will be read from the host (== the Gitlab Job)
 
> the '$' notation allows you to work with [Gitlab Variable as well as Gitlab Secrets](https://docs.gitlab.com/ee/ci/variables/#variables)


# Repository mode

Assuming your Gitlab is already configured to run VOC. To enable VOC for a project, several options are available:
* full local
* only VOC configuration local, Docker related files and code on remote
* VOC and Docker related files local, code on remote


## Full local
You already have a project hosted on your Gitlab and it has a compose file, let's say `docker-compose.super-stack.yml`. 
* add the `.gitlab-ci.yml` to configure Gitlab to run VOC on your project
* add the VOC configuration file, like a `simple-stack-instance.super-stack.my-first-super-stack.yml`

That's it, next time you commit the stack instance or the compose file, a stack named 'my-first-super-stack' will be redeployed using 'docker-compose.super-stack.yml'.
If your compose file has any 'build' attribute, committing any file under the given 'context' will also trigger the redeployment. 
 
## Only VOC configuration local, Docker related files and code on remote
You already have a project hosted somewhere on Git repo and it has a compose file, let's say `docker-compose.awesome-stack.yml`. 
* create an empty project on your Gitlab
* add the `.gitlab-ci.yml` to configure Gitlab to run VOC on your project
* add the VOC `repo.project-on-github.json` with detail about your remote project
* add the VOC configuration file, like a `simple-stack-instance.remote-repo.awesome-stack.demo-awesome.yml`
  * don't forget to add the `repo` key
  
That's it, next time you commit a the stack instance or the repo configuration file, a stack named 'demo-awesome' will 
be redeployed using 'docker-compose.awesome-stack.yml' from your remote repository. 
VOC cannot trigger actions when remote repository changes. However, f build contexts on remote repo are updated, you can 
rely on (Commit actions)[#Commit Actions] to trigger re-deployment. 

## VOC and Docker related files local, code on remote
This time you have a repo somewhere with an application that you want to build and deploy without touching the source repo. 
* create an empty project on your Gitlab
* add the `.gitlab-ci.yml` to configure Gitlab to run VOC on your project
* add the VOC `repo.project-on-github.json` with details about your remote project
* add the VOC configuration file, like a `simple-stack-instance.remote-repo.awesome-stack.demo-awesome.yml`
  * don't forget to add the `repo` key

## remote-repo
When working with remote repository
* add `.remote-repo` in the VOC configuration file name (just after the resource type, like `image.remote-repo.dakota.json')
* add an extra `repo` key in the VOC configuration

The `repo` key can be the repo details with
```json
"repo":{
  "url": "https://github.com/remipichon/voc-configuration.git",
  "name": "voc-configuration-demo"
}
```
or the name of an already referenced repo via  

### repo.\<repo-name\>.json
```json
{
  "url": "ssh://root@hostname/a-remote-repo",
  "credential": "VOC_CONF_KEY"
}
```
* url
  * mandatory
  * regular Git URL
* credential
  * mandatory if SSH
  * ENV var storing the private key to access Git repo, best way is [Gitlab Secret](http://docs.gitlab.com/ce/ci/variables/README.html#secret-variables)
 



# Remote host
When you want VOC to build and deploy on a remote Docker daemon. Your Gitlab needs to be configured with a `node_remote_runner` with
proper certificates to reach the remote Docker daemon over secured TLS. 

### host-file

Not implemented yet



# Important notice

VOC looks for files by their name, no matter where they are. File names should be unique across the all configuration repository.

* dc-name: docker compose name, should define what's in the compose file
* sd-name: stack definition name, should define what does provide the stack
* si-name: stack instance name, used by docker stack deploy
* suffix: for instance only, optional, can be used to have more than one stack with same name. Each stack should be deployed in separate swarm of course (docker will not allow a second stack, you will get the error from docker itself)

| git doesn't work when moving file as diff tree gives D and A for the same file, VOC is confusing and try to delete and add the same thing

| all __xx-name__ and suffix should match [a-zA-Z0-9_-]+


# Triggers

There is two ways to trigger a build/deploy/remove:
* updating files
* commit actions

## Updating files

VOC will trigger whenever you commit
* a VOC configuration file 
* a Docker related file
* a file in any of the defined Docker build contexts 

| Any contexts means any directories referenced by configuration ('context' in image config) or regular contexts in 'build' attribute of docker-composes.

Depending on what changed, VOC will apply different actions:

* image config or Dockerfile or context for image changed
   * ==> VOC will build and push to registry (if image has push option)
* simple stack instance or stack instance config file changed
   * ==> VOC will build (if related docker-compose files have 'build; attribute) and deploy the stack
* stack definition config file changed
   * ==> VOC will build and deploy any stack instance relying on this stack definition
* docker-compose file changed: 
   * ==> VOC will rebuild and redeploy any directly related Simple Stack Instance and any Stack Definition that use this docker compose (and thus, any Stack instance relying on the trigger Stack Definition) 

| VOC doesn't trigger anything when remote repo changes (is has currently no way of knowing it).

| In remote-repo mode, Docker related files and context are in the remote repo. VOC only watches the local repo which has only VOC configuration file and thus will trigger actions only when those files are updated.


## Commit Actions

Several actions are available via commit message. Commit actions are prior to changes in files (git message prior over git payload) and work the same regardless of the mode (local-repo or remote-repo or remote-host). 

* dryRun: [dry-run] do as much as possible without executing any Docker related commands, prints the cmds as result.json (still generate intermediate compose file)
* doAll or buildDeployAll: [do-all] or [build-deploy-all] build and push (if push defined) all images + build (if context defined) and deploy all Simple Stack Instances and Stack Instances (if enabled)
  * buildAll: [build-all] build all images + build (if context defined) all Simple Stack Instances and Stack Instances 
    * deployAll: [deploy-all]  push (if push defined) all images + deploy all Simple Stack Instances and Stack Instances (if enabled)
      * removeAll: [remove-all] remove all Simple Stack Instances and Stack Instances
         * buildResourceName: [build-\<resource-name\>] build image or Simple Stack Instances or Stack Instances 
         * deployInstanceName: [deploy-\<instance-name\>] deploy Simple Stack Instances or deploy Stack Instances 
         * deployInstanceName: [push-\<instance-name\>] push image 
         * removeInstanceName: [remove-\<instance-name\>] remove Simple Stack Instances or Stack Instances

Above hierarchy is used. If a '[do-all]' is found, it will not ready any further actions. same for '[build-all]', 'deployAll' and 'removeAll' in that order. Instance specific actions can be grouped in one commit message (if not other common action defined of course)
'[dry-run]' can be combined with them all. The order in the commit message is not used.


































































