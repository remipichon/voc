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
# add mail support
DCF=" $DCF -f docker-compose.mail.yml"
````

component to test the install
````
# test mail
DCF=" $DCF -f ./test/docker-compose.mail.test.yml"

````

You need to have a DNS A record 'gitlab.<HOSTNAME>' that points to '<HOSTNAME>', ngninx-proxy will do the redirection
* gitlab.rb external_url 'htt://<HOSTNAME>' (port 80)
* docker compose EXPOSE 80 + env for nginx proxy

````
cd voc/core; 
# generate intermediate compose file
HOSTNAME=gitlab.remip.eu
HOSTNAME=$HOSTNAME docker-compose $(echo $DCF) config > docker-compose.intermediate.yml

# prepare Gitlab conf
sed -i -e "s/HOSTNAME/$HOSTNAME/g" gitlab/gitlab.rb

# build needed image
docker-compose -f docker-compose.intermediate.yml build
````


##### run stack
````
docker stack deploy --compose-file docker-compose.intermediate.yml voc
````

Visit localhost:81 or your server's ip/hostname to create a password for the 'root' user. 

In case of forgotten password, please refer to https://docs.gitlab.com/ee/security/reset_root_password.html

##### update stack
build image with docker compose
delete corresponding service
docker stack deploy

# Config

## Gitlab

Edit your HOSTNAME in core/gitlab/gitlab.rb. Default is gitlab, HOSTNAME that will only work within the voc Docker overlay network.
If running locally, you will need to use 'localhost' hostname to add a git remote. Everything else work the same. 
On a server, consider registering a DNS name even if it will work with an ip. 

**if gitlab will be exposed on another port than 80, GITLAB_PUBLIC_PORT has to be the same port as the one specified in gitlab.rb**

To change hostname on a running Gitlab. Be aware that those changes will be lost if the container get killed
````
/etc/gitlab/gitlab.rb
    external_url 'http://<new_host_name>/'
    
gitlab-ctl reconfigure; gitlab-ctl restart 
````

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
url=http://gitlab.remip.eu
token=ErrysV73DDmBXdsWxyvv
image=nodedocker
volumes=/var/run/docker.sock:/var/run/docker.sock

gitlab-runner register --non-interactive --name $name --url $url --registration-token $token --executor docker --docker-tlsverify=false --docker-pull-policy if-not-present --docker-image $image --docker-privileged true --docker-disable-cache false --docker-volumes $volumes

#currently register doesn't support volume, add them by hand, do it it vim if another runner already exists. You would override its volumes.
sed -i "/volumes/c\    volumes = [\"/cache\",\"$volumes\"]" /etc/gitlab-runner/config.toml
````

Go to <your_gitlab>/admin/runners/ to add _node_host_docker_ tag and use it in your gitlab-ci.yml file.

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
image=noderemotedocker

gitlab-runner register --non-interactive --name $name --url $url --registration-token $token --executor docker --docker-network-mode $docker_network_mode --docker-tlsverify=false --docker-pull-policy if-not-present --docker-image $image --docker-privileged true --docker-disable-cache false
````

Go to <your_gitlab>/admin/runners/ to add _node_remote_docker_ tag and use it in your gitlab-ci.yml file.

### Several remote Docker
So far not supported out of the box:
* copy _Dockerfile-node-remote-docker_ and adapt 'remoteDockerClientCert/*.pem'
* in _docker-compose.remote.yml_ copy _node_remote_docker_ and adapt 'context' and 'image' name.
* add another runner using that image OR specify which remote image to use in .gitlab-ci.yml

Runners configuration is in /etc/gitlab-runner/config.toml

## Mailin
Voc can receive emails sent to XXX@subdomain.domain.com (following naming of Mailin doc) and redirect them to the webhook service of choice over HTTP. 

### DSN configuration
DNS record are needed to properly receive mail. Please follow "The crux: setting up your DNS correctly" from [Mailin Doc](http://mailin.io/doc)

### Compose for webhook service
Your email webhook service should be part of the _mail_ network, following the Docker Compose for your service
````
services:
  mail_webhook:
    networks:
      - voc_mail

networks:
  voc_mail:
    external: true
````

### Configure forwarding to your webhook service
Configure the _mailin_mediation_ to forward the emails to your service
``` 
MAILDEST=XXX                            
WEBHOOK=mail_webhook:80/handledoc_mail     
TYPE=field|file                         
docker service update voc_mailin_mediation --env-add $MAILDEST=$WEBHOOK --env-add ${MAILDEST}_TYPE=$TYPE
docker kill $(docker ps -q --filter "name=voc_mailin_mediation*")       #node-wide cmd, not a swarm-wide cmd
docker service logs -f voc_mailin_mediation
```
* MAILDEST: #he XXX of XXX@subdomain.domain.com
* WEBHOOK: HTTP endpoint of your email webhook service
* TYPE: whether your endpoint can deal with POST files or POST field [Curl doc, see -F, --form](https://curl.haxx.se/docs/manpage.html)
  * field: default
  * file: slightly slower as the mediation service has to store the file before sending them. All files get deleted after POSTing to your webhook


### Implement the email webhook
* your service webhook will receive POST request 
* mailinMsg.json is not encoded, see [Mailing doc](http://mailin.io/doc)
* attachments content are encoded in Base64, your service needs to decode them. Names of the attachements files can be found in mailinMsg.json
* you can mocked mediation by using curl 

### Test with curl

How to test Mail Mediation configuration or your email wehbook service
```` 
cd core/test/mock-mailin
cat TestFile | base64 > temp            

#send to mediation
curl -F mailinMsg="<mailinMsg.json"  "localhost:3100/mediation"
#send to mediation with attachement
curl -F TestFile="<temp" -F mailinMsg="<mailinMsg.json"  "localhost:3100/mediation"

#send directly to your service  if $WEBHOOK_TYPE=field (default)
curl -F TestFile="<temp" -F mailinMsg="<mailinMsg.json"  "localhost:3200/webhook"

#send directly to your service if $WEBHOOK_TYPE=file 
curl -F TestFile="@temp" -F mailinMsg="@mailinMsg.json"  "localhost:3200/webhook"

rm temp
````
* TestFile is the name of the attachment, attachment filename should match the mailinMsg.json
* mailing.json must follow these rules:
  * no  \n
  * no '
  * no < or >

### SpringBoot impl
SpringBoot implementation with type=file [https://github.com/remipichon/WhatsAppElastic](https://github.com/remipichon/WhatsAppElastic/blob/master/app/src/main/java/co/paan/controller/ConversationRestController.java#L73)

### NodeJs impl
NodeJs with _request_ module for type=field [https://github.com/remipichon/voc](https://github.com/remipichon/voc/blob/master/core/test/mock-mail-endpoint/server.js#L19)

