# VOC configuration

Following will explain you how to create configuration as code that is understood by VOC. 


# Intro
VOC uses convention over configuration. In particular, be careful to the file naming as VOC uses a precise convention
to find which files are related to each others. You will encounter two type of files
* Docker related files (Dockerfile, Docker Compose file)
* configuration files (any *.json)

Updating one of the file (Docker related or conf) will trigger the process (build or deploy). Both files has to be
in the same directory. 

# Image
Two files per image
* Dockerfile-\<image-name\>
* image-\<image-name\>.json

\<image-name\> is not use to tag the image to make it more flexible but we encourage you to have a relevant \<image-name\>.

Two actions are available
* build
* push to registry (need to build first)

## Dockerfile-\<image-name\>
Regular Dockerfile, see Docker docs.

## image-\<image-name\>.json

````
{
  "tag": "alpinette",
  "push": "registry:5000/alpinette"
}
````
* tag
 * mandatory
 * context will be the folder where the Dockerfile and conf are standing
 * built image will be tagged with the 'tag' value  
* push
 * non mandatory
 * built image will be pushed to the 'push' value, it has to be a valid repository
 * currently not supporting 'docker login' nor unsecure registry


# Stack
Two files per stack
* docker-compose-\<stack-name\>.yml
* stack-\<stack-name\>.yml

(in the future)
\<stack-name\> is not use to name the stack to make it more flexible but we encourage you to have a relevant \<stack-name\>.

(now) \<stack-name\> is used to name the stack

````
{
   "enabled": true|false
}
````
* enable
 * not mandatory, true or false
 * deploy or remove a stack
(in the future)
* stackName
  * mandatory
  * used to name the deployed stack



# Remote mode
VOC can pull your repository to build or deploy from it. 





