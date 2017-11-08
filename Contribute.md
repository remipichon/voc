# Development
Follow the 'installation' process while paying attention to the following:

## Runner app

### Add a Runner app to dev
* when defining the runner, follow this instead
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

Each time the runner will start, it will use the latest code in the volume. Just retry pipeline or commit to trigger actions, runner app will use the latest code

### Add a conf repo to trigger actions

* add your public key to the root user
* clone [voc configuration example repo](https://github.com/remipichon/voc-configuration)
* create empty project on Gitlab UI
* add git SSH remote (beware the URL given by the UI, replace 'gitlab' with 'localhost') to the voc configuration you cloned
* push to your local Gitlab 
* pipeline with runner will trigger the build/push/deploy


Want to quickly test some JS code without anything around it ? (assuming you have some valid conf at 'voc-configuration' and VOC code at 'voc')
````
ID=$(docker run -d -p 9229:9229 -v '/var/run/docker.sock:/var/run/docker.sock' -v $(pwd)/voc-configuration/:/voc-configuration -v $(pwd)/voc/core/app:/app nodedocker tail -f /dev/null)
docker exec -ti $ID bash
cd /app
DEV=true HOME=/ CI_PROJECT_DIR=/voc-configuration node --inspect --inspect-brk=0.0.0.0 app.js
DEV=true HOME=/ CI_PROJECT_DIR=/voc-configuration node --inspect --inspect=0.0.0.0 app.js
docker rm -f $ID
>>>>>>> 10f97b2db66ff3e07279284177516f07e2031d54
````
I will run and exec into a container using the same image as the runner. Remove '--inspect-brk=0.0.0.0' if you don't want to connect a debugger.

When running locally, most likely you computer will go to sleep putting down Docker which seems to be equivalent to
a server reboot when it comes to SSH. As a result, git push to your local Gitlab will fails after resuming. Use this to 
delete the 'localhost' entry from your known_hosts (not working)
````
sed -i '/localhost/c\ /' ~/.ssh/known_hosts
````

### Debug runner app
above command already setup eveything for remote debug to work. Use your favorite tool from the list https://nodejs.org/en/docs/inspector/
* Webstorm: Chromium Remote seems to be working better than Node Remote
* port is default, 9228
* made to work with NodeJs V8
* tested on Webstorm (Chromium Remote conf) and Chromium based Chrome (plugin)

### Test Runner app

````
docker run -d  -v $(pwd)/voc/core/app:/app nodedocker cd /app/test; CI_PROJECT_DIR=/app/test/test-workspace TEST_RESOURCES=/app/test/test-resource HOME=/ node test-suite.js
OR
docker rm -f test-runner; docker run -d  --name test-runner -v $(pwd)/voc/core/app:/app nodedocker tail -f /dev/null
docker exec -ti test-runner bash
cd /app/test; CI_PROJECT_DIR=/app/test/test-workspace TEST_RESOURCES=/app/test/test-resource HOME=/ node test-suite.js
docker rm -f test-runner
````

## Email Mediation app
* add volumes
* kill container and code is refreshed
