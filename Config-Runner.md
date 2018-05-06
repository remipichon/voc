# Config

* Configure Gitlab hostname
* Configure local Docker Registry
* Configure Runner (local and remote)

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
url=http://<HOSTNAME>      # runner will use the public access to reach Gitlab (to clone the repo)
# url=http://gitlab        # runner will use the Docker overlay network that Gitlab and the runners can share with following   
# docker_network_mode=voc_network
token=<TOKEN> #from /admin/runners
image=nodedocker
volumes=/var/run/docker.sock:/var/run/docker.sock

gitlab-runner register --non-interactive --name $name --url $url --registration-token $token --executor docker --docker-network-mode $docker_network_mode --docker-tlsverify=false --docker-pull-policy if-not-present --docker-image $image --docker-privileged true --docker-disable-cache false --docker-volumes $volumes

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
url=http://<HOSTNAME>      # runner will use the public access to reach Gitlab (to clone the repo)
# url=http://gitlab        # runner will use the Docker overlay network that Gitlab and the runners can share with following   
# docker_network_mode=voc_network
token=<TOKEN> #from /admin/runners
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
