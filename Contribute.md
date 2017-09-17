# Development

## Runner app
Follow the 'installation' process while paying attention to the following:

* when defining the runner, follow this
> currently register doesn't support volume, add them by hand, do it it vim if another runner already exists. You would override its volumes.
````
docker exec -ti $(docker ps -q --filter "name=voc_host_docker_runner") bash

name=node_host_docker
url=http://gitlab        # runner will use the Docker overlay network that Gitlab and the runners can share with following   
docker_network_mode=voc_network
token=2ztntGipiY8ukcngQKzU
image=nodedocker
volumes=/var/run/docker.sock:/var/run/docker.sock

#extra volumes to share the code with the host
volumes=\"${volumes}\",\"/Users/remi/work/voc/core/app:/root/app/\"

gitlab-runner register --non-interactive --name $name --url $url --registration-token $token --executor docker --docker-network-mode $docker_network_mode --docker-tlsverify=false --docker-pull-policy if-not-present --docker-image $image --docker-privileged true --docker-disable-cache false --docker-volumes $volumes

#currently register doesn't support volume, add them by hand, do it it vim if another runner already exists. You would override its volumes.
sed -i "/volumes/c\    volumes = [\"/cache\",$volumes]" /etc/gitlab-runner/config.toml
````

Each time the runner will start using the latest code in the volume. Just retry pipeline or commit to trigger actions.

* add your public key to the root user
* clone [voc configuration example repo](https://github.com/remipichon/voc-configuration)
* create empty project on Gitlab UI
* add git SSH remote (beware the URL, remplace 'gitlab' with 'localhost') to the voc configuration you cloned
* push to your local Gitlab 
* pipeline with runner should trigger the build/push/deploy





## Email Mediation app
* add volumes
* kill container and code is refreshed