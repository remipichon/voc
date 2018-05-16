# What is VOC ?


VOC can build Docker images and deploy Docker stacks from configuration as code on Gitlab8. 

VOC currently consist of: 
* a [Gitlab 8](https://about.gitlab.com/) instance
* a Gitlab Runner wih Docker socket binding or Docker remote mode over TLS to build and deploy
* an Email SMTP service to forward incoming emails to your deployed stack
* a Nginx to redirect your DNS record to your service


# Who does what ?

### Gitlab
* store VOC configuration which consists of Dockerfiles, Docker compose files and small Json VOC configuration riles
* trigger The VOC Runner App whenever a file get comited

### Runner (ready)
* build, push images and pull and deploy stacks using Docker, either locally or remotely
* on commit
  * read modified files
  * for each docker-compose-<stackName>.yml or stack-<stackName>.json
    * read status (added, modified, removed)
    * apply docker stack deploy/remove on modified stackName
  * for each Dockerfile-<imageName> or image-<imageName>.json
    * build image
    * push image


# How to test it ?

## From existing Gitlab8 instance

Voc is so easy to enable. If you already have a Gitlab 8 and a Gitlab Runner defined, you just need to create a new runner using the Voc Runner NodeJs App Docker iamage available on Docker Hub. 
Following is the config.toml to use to create the runner: 
```
name=voc_docker_host
url=http://<HOSTNAME>      # runner will use the public access to reach Gitlab (to clone the repo)
# url=http://gitlab        # runner will use the Docker overlay network that Gitlab and the runners can share with following   
# docker_network_mode=voc_network #if using the overlay network
token=<TOKEN> #from /admin/runners
image=vocproject/nodedocker
volumes=/var/run/docker.sock:/var/run/docker.sock # runner will use local Docker to build and deploy
```

You add the `.gitlab-ci.yml` at the root of your repo: 
```yaml
before_script:
   - docker info

vocrunnerapp:
 stage: build
 script:
   - cd $CI_PROJECT_DIR; node /root/app/app.js
 tags:
   - voc_docker_host
 artifacts:
   when: always
   expire_in: 1 week
   paths:
    - job-result/result.json

variables:
 GIT_STRATEGY: fetch
```

and voilà !

Next time you commit a file, the VOC Runner App will read your commit payload to understand what needs to be done. 
 
## From scratch (Ubuntu) 
 
If you don't have Gitlab already, you can easily have it with Voc all configured via the given Ansible playbooks that does the heavy lifting. Read the [installation procedure](Install.md) to know more. 

## Understand the VOC configuration

Read more about the [VOC configuration](Voc-configuration.md) to discover all the available features.

## Enable Email

Follow the [Mailin](Mailin.md) to configure your services to easily receive emails. 


