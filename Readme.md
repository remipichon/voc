# kesako?

* Gitlab instance
* Gitlab Runner wih Docker socket binding 
* NodeJs API
* VueJs UI


## responsibilities

### Gitlab
* old conf as code
* trigger runner 

### Runner
* build/push/pull/deploy using Docker
* on commit
  * read modified files
  * for each docker-compose-*.yml
    * read status (added, modifier, removed)
    * apply docker stack deploy/remove on modifier files

### API
* GET 
  * /stacks queries Docker API
  * /stackDefinitions read repo
* PUT 
  * generate docker-compose json file from template (repo) and custom options (put json body)
  * git pull; git add; git commit; git push
* POST 
  * verify request
    * how to make Gitlab check compose file as json ?
  * update file, git pull; git commit; git push
* DELETE
  * git pull; git delete; git commit; git push


### UI
* POST custom options from arguments list
* PUT updated docker-compose as json


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

* add registry (via gitlab) ==> find cert in gitlab data folder
* ~~build from docker:latest (job base image) install node~~
  * ~~from docker, add node OR from node add docker~~
  * ~~can dockerode deploy stack with compose file ?~~
  * ~~find a lib to read commit (which file ?, create/udpdate/delete ?)~~
* ~~node script with docker api~~
  * __(~~docker exec with compose file ~~OR docker API with compose json)__

* what Gilab can do
  * provision (build, ~~provision, update, delete~~) a stack from a Docker Compose file ~~(yml)~~ (json)
     * compose as json: docker-compose-ID.yml
     * ~~stack-ID.json~~ to describe the stack to deploy
        * ~~enable/disable~~
        * initiator
        * description
  * build a lone image and push it somewhere (build, tag, push)
  * periodically garbage collect
  * custom action 
    * backup data
    * restart services/containers


* node server KoaJs 
* api to POST stack as docker compose json file
  * git clone/git pull
  * add/update file
  * git commit; git push



curl --unix-socket /var/run/docker.sock http:/v1.27/containers/json

MacBook-Pro-de-Remi:test remi$ sudo lsof -iTCP -sTCP:LISTEN -n -P