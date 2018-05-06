# Manual installation

Consider reading Config part before in order to get it right and configure quickly. 
### Docker stack on a Swarm node

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
HOSTNAME=gitlab.remip.eu #just gitlab is localhost
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

Visit localhost:9020 or your server's ip/hostname to create a password for the 'root' user. 

In case of forgotten password, please refer to https://docs.gitlab.com/ee/security/reset_root_password.html

##### update stack
* build image with docker compose
* delete corresponding service
* run docker stack deploy


