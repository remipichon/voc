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


Want to quickly test some JS code without anything around it ? (assuming you have some valid conf at 'voc-configuration' and code at 'voc')
````
ID=$(docker run -d -p 9229:9229 -v '/var/run/docker.sock:/var/run/docker.sock' -v $(pwd)/voc-configuration/:/voc-configuration -v $(pwd)/voc/core/app:/app nodedocker tail -f /dev/null)
docker exec -ti $ID bash
cd /app
DEV=true CI_PROJECT_DIR=/voc-configuration node --inspect --inspect-brk=0.0.0.0 app.js
````

> if CI_PROJECT_DIR points to a repo, running above command will do the same as triggering the runner

When running locally, most likely you computer will go to sleep putting down Docker which seems to be equivalent to
a server reboot when it comes to SSH. As a result, git push to your local Gitlab will fails after resuming. Use this to 
delete the 'localhost' entry from your known_hosts (not working)
````
sed -i '/localhost/c\ /' ~/.ssh/known_hosts
````

### Debug runner app
above command already setup eveything for remote debug to work. Use your favorite tool from the list https://nodejs.org/en/docs/inspector/
* Webstorm: Chromium Remote seems to be working better
* port is default, 9228
* made to work with V8
* tested on Webstorm and Chromium based Chrome


## Email Mediation app
* add volumes
* kill container and code is refreshed