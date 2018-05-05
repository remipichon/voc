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





# for api to get docker state
curl --unix-socket /var/run/docker.sock http:/v1.27/containers/json

# netstat for mac
sudo lsof -iTCP -sTCP:LISTEN -n -P

# Ansible

First playbook to play
ansible-playbook first_run.yml -i keizersgrasht.host -e ansible_user='root'

#Some questions :)

1. Gitlab files will be stored on ~/voc/core/gitlab or ~/gitlab ? Would say ~/gitlab for having a beautiful tree, but above you said "Edit your HOSTNAME in core/gitlab/gitlab.rb"
2. I think we should split the dev and system code. All the system part (Gitlab, Docker, Runner, Registry, nginx) should be handle by ansible, so into /voc/ansible.
   And then, all the JS code relative to the app should be stored into /voc/core. What do you think ?
   If you agree, we have to move all the files from core to ansible except ./app which is the JS code.
