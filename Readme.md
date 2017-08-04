# kesako?

Build Docker images and deploy Docker stack from conf as code. 

* Gitlab instance
* Gitlab Runner wih Docker socket binding or Docker remote mode over TLS
* NodeJs API
* VueJs UI


## responsibilities

### Gitlab (ready)
* hold conf as code
* trigger runner 

### Runner (ready)
* build/push/pull/deploy using Docker
* on commit
  * read modified files
  * for each docker-compose-<stackName>.yml or stack-<stackName>.json
    * read status (added, modified, removed)
    * apply docker stack deploy/remove on modified stackName
  * for each Dockerfile-<imageName> or image-<imageName>.json
    * build image

### API 
#### /stacks
* GET /stacks
  * queries Docker API (exec, HTTP API doesn't support stack yet)
    * per stack, gather 
      * stack info
      * stack's services info
      * service's tasks info
      * config (repo, json)
* POST /stacks + JSON body
  * body: 
    * stackDefinition
    * custom options
  * generate docker-compose.yml file from custom options (PUT json body) injected into stackDefinition (repo, docker-compose-template file) 
  * validate generated docker-compose: docker-compose -f docker-compose.yml config
  * git pull; git add; git commit; git push
* PUT /stacks/<stackName> + JSON body
  * body: 
    * stackDefinition
    * custom options (complete options, even those not updated)
  * generate docker-compose file from template and custom options    
  * validate generated docker-compose: docker-compose -f docker-compose.yml config
  * update file, git pull; git commit; git push
* DELETE /stacks/<stackName>
  * git pull; git rm; git commit; git push
  
#### /images
* GET /images
  * queries Docker API (exec, HTTP API doesn't support stack yet)
    * per image, gather 
      * image info
      * config (repo, json)
      
__which operations are available ??__      

#### /stackDefinitions
* GET
  * read docker-compose templates from repo 

### UI
* deploy
*   POST custom options from arguments list
* update deploy
*   PUT custom options from arguments list
* build


### configuration

#### dynamic stack
* docker-compose-<stackName>.yml
* stack-<stackName>.json

#### stack definition
* __???? stack-template ????__
  * __?? custom options ??__

# Install

Consider reading Config part before in order to get it right and configure quickly. 
## Docker stack on a Swarm node

Prerequisites:
* Docker 17.06.0-ce
* Docker Compose 1.41.1
* Swarm mode enabled

##### prepare FS to build
````
git clone https://github.com/remipichon/voc.git
mkdir -p ~/srv/{gitlab/{config,logs,data},gitlab-runner/config}
````

##### build
Select one of the DCF (docker compose files)
````
# gitlab 
DCF=' -f docker-compose.yml '
# gitbal + host runner (to access local Docker daemon, the one on which Gitlab is running)
DCF=' -f docker-compose.yml -f docker-compose.host.yml '
# gitlab + remote runner (to access remote Docker daemon, needs to have certificates, see [Remote Docker](#Remote Docker)
DCF=' -f docker-compose.yml -f docker-compose.remote.yml '
# gitlab + both host and remote runner
DCF=' -f docker-compose.yml -f docker-compose.remote.yml -f docker-compose.host.yml '
````

````
cd voc/core; 
# generate intermediate compose file
GITLAB_PUBLIC_PORT=8020    #optional, see default in compose file
GITLAB_PUBLIC_PORT=$GITLAB_PUBLIC_PORT docker-compose $(echo $DCF) config > docker-compose.intermediate.yml

# build needed image
docker-compose -f docker-compose.intermediate.yml build
````

##### run stack
````
docker stack deploy --compose-file docker-compose.intermediate.yml voc
````

Visit localhost:81 or your server's ip/hostname to create a password for the 'root' user. 

In case of forgotten password, please refer to https://docs.gitlab.com/ee/security/reset_root_password.html

# Config

## Gitlab

Edit your hostname in core/gitlab/gitlab.rb. Default is gitlab, hostname that will only work within the voc Docker overlay network.
If running locally, you will need to use 'localhost' hostname to add a git remote. Everything else work the same. 
On a server, consider registering a DNS name even if it will work with an ip. 


## Registry
TODO

## Runners
Runners are used by Gitlab to apply the state to the targeted Docker. Two type of runners exists:
* host Docker runner: the sate will be applied to the same Docker Gitlab is running on 
* remote Docker Runner: the state will be applied to a remote Docker over TLS

Rely on _tags_ in _.gitlab-ci.yml_ to specify which runner and thus where the sate will be applied.


### Add a runner
Runner are configured to use a specific image. You don't have to specify an image in the gitlab-ci.yml file. 

Why? Host Docker Runner needs to have Docker socket binding while Remote Docker Runner needs to have certificates. 
Different images, different runners. 

### Host Docker 
Image is _nodedocker_ and should be run with a runner that has the Docker socket mounted as a volume. 
Image is built out of the box by Docker Compose but service has to be configured by hand. 

````
docker exec -ti $(docker ps -q --filter "name=voc_host_docker_runner") bash

name=node_host_docker
url=http://<HOSTNAME>
token=<TOKEN>
docker_network_mode=voc_network
image=vocproject/nodedocker
volumes=/var/run/docker.sock:/var/run/docker.sock

gitlab-runner register --non-interactive --name $name --url $url --registration-token $token --executor docker --docker-network-mode $docker_network_mode --docker-tlsverify=false --docker-image $image --docker-privileged true --docker-disable-cache false --docker-volumes $volumes

#currently register doesn't support volume, add them by hand, do it it vim if another runner already exists. You would override its volumes.
sed -i "/volumes/c\    volumes = [\"/cache\",\"$volumes\"]" /etc/gitlab-runner/config.toml
````

## Remote Docker
Image is _noderemotedocker_. To build this image, first create yourself a set of certificates:
https://docs.docker.com/engine/security/https/

Copy the tsl ca certificate (ca.pem), the tsl certificate (cert.pem) and tsl key (key.pem) into _core/remoteDockerClientCert_.

Docker Compose will build an image including the certificates. **Don't ever _push_ this image** to a non private Docker Registry as it contains everything to do everything as root on your remote host. 

````
docker exec -ti $(docker ps -q --filter "name=voc_host_docker_runner") bash

name=node_remote_docker
url=http://<HOSTNAME>
token=<TOKEN>
docker_network_mode=voc_network
image=<private_or_local_registry>/noderemotedocker

gitlab-runner register --non-interactive --name $name --url $url --registration-token $token --executor docker --docker-network-mode $docker_network_mode --docker-tlsverify=false --docker-image $image --docker-privileged true --docker-disable-cache false
````

### Several remote Docker
So far not supported out of the box:
* copy _Dockerfile-node-remote-docker_ and adapt 'remoteDockerClientCert/*.pem'
* in _docker-compose.remote.yml_ copy _node_remote_docker_ and adapt 'context' and 'image' name.
* add another runner using that image OR specify which remote image to use in .gitlab-ci.yml



# TODO

## Core
* ~~external_url to gitlab compose (gitlab.rb) ==> to test~~
* ~~name docker compose network (not gitlab_default) ==> to test~~
* ~~name gitlab container (not gitlab_gitlab_1)		==> to test~~
* ~~configure runner from docker-compose env (manually add token in config.toml) OR config.toml is defined as it and loaded into the runners that are not configured at all~~

* ~~build from docker:latest (job base image) install node~~
  * ~~from docker, add node OR from node add docker~~
  * ~~can dockerode deploy stack with compose file ?~~
  * ~~find a lib to read commit (which file ?, create/udpdate/delete ?)~~
* ~~node script with docker api~~
  * (~~docker exec with compose file~~ ~~OR __docker API with compose json)__~~
  
* what Gilab can do
  * ~~provision (build, ~~provision, update, delete) a stack from a Docker Compose file ~~(yml) (json)~~
     * ~~compose as json: docker-compose-ID.json~~
     * ~~stack-ID.json~~
        * ~~enable/disable~~
  * ~~manage build result du job~~
      * ~~https://docs.gitlab.com/ce/ci/yaml/README.html#artifacts~~
  * ~~build a lone image and~~ push it somewhere (~~build~~, ~~tag~~, push) ==> add registry
    * ~~Dockerfile + config json~~
* make nododocker be able to push to registry 
* review/comment/refact/document all Gitlab code
* ~~docker remote mode~~
* ~~automate install~~
==> install on server
==> try out with Whatstat

## UI and user friendliness
* templating and definitons
* Gitlab
  * periodically garbage collect
  * custom action 
  * remove/kill services/tasks
  * fail job is one error  
* NodeJs API  
  * node server KoaJs 
 
 
# to test app
 add to runner 
     volumes = ["/var/run/docker.sock:/var/run/docker.sock", "/cache", "/Users/remi/WebstormProjects/voc/core/app:/root/app/"]


# for api to get docker state
curl --unix-socket /var/run/docker.sock http:/v1.27/containers/json

#netstat for mac
sudo lsof -iTCP -sTCP:LISTEN -n -P

