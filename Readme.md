# kesako?

Build Docker images and deploy Docker stack from conf as code. 

* Gitlab instance
* Gitlab Runner wih Docker socket binding 
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

# install and config

```
docker-compose up -d
sed -i 's/# external_url 'GENERATED_EXTERNAL_URL'/external_url 'http://gitlab/'/g' gitlab/config/gitlab.rb
registry_external_url 'https://registry.gitlab:4567'

# get runner registration token and edit config.toml or 
gitlab-runner register --config "/etc/gitlab-runner/config.toml"
```

# to automate install and config

* build custom image FROM gitlab/gitlab-ce and update its gitlab.rb  
* build custom image FROM gitlab/gitlab-runner and create its config.toml  


## config.toml
```
concurrent = 1
check_interval = 0

[[runners]]
  name = "node_host_docker"
  url = "http://gitlab"
  token = "47fd4c172b3b789d349bea2f99e122"
  executor = "docker"
  [runners.docker]
    network_mode = "core_network"
    tls_verify = false
    image = "vocproject/nodedocker"
    privileged = true
    disable_cache = false
    volumes = ["/var/run/docker.sock:/var/run/docker.sock", "/cache", "/Users/remi/WebstormProjects/voc/core/app:/root/app/"]
    shm_size = 0
  [runners.cache]
``` 


# TODO

* ~~external_url to gitlab compose (gitlab.rb) ==> to test~~
* ~~name docker compose network (not gitlab_default) ==> to test~~
* ~~name gitlab container (not gitlab_gitlab_1)		==> to test~~
* ~~configure runner from docker-compose env (manually add token in config.toml) OR config.toml is defined as it and loaded into the runners that are not configured at all~~

* review/comment/refact/document all Gitlab code
* review/comment/refact/document all Gitlab code
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

# TODO apres Vieilles Charrues

* make nododocker be able to push to registry 
* review/comment/refact/document all Gitlab code
* templating and definitons
* Gitlab
  * periodically garbage collect
  * custom action 
  * remove/kill services/tasks
  * fail job is one error  
* NodeJs API  
  * node server KoaJs 
 


curl --unix-socket /var/run/docker.sock http:/v1.27/containers/json

MacBook-Pro-de-Remi:test remi$ sudo lsof -iTCP -sTCP:LISTEN -n -P
