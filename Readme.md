# install and config

```
docker-compose up -d
sed -i 's/# external_url 'GENERATED_EXTERNAL_URL'/external_url 'http://gitlab/'/g' gitlab/config/gitlab.rb
# get runner registration token and edit config.toml or gitlab-runner register
```

# to automate install and config

* build custom image FROM gitlab/gitlab-ce and update its gitlab.rb  
* build custom image FROM gitlab/gitlab-runner and create its config.toml  


## config.toml
```
concurrent = 1
check_interval = 0

[[runners]]
  name = "host_docker"
  url = "http://gitlab"
  token = "d40649f8dadafc74038ebb8bab4d60"
  executor = "docker"
  [runners.docker]
    tls_verify = false
    image = "docker:latest"
    privileged = true
    disable_cache = false
    volumes = ["/var/run/docker.sock:/var/run/docker.sock", "/cache"]
    network_mode = "gitlab_network"
    shm_size = 0
  [runners.cache]



# TODO

* ~~external_url to gitlab compose (gitlab.rb) ==> to test~~
* ~~name docker compose network (not gitlab_default) ==> to test~~
* ~~name gitlab container (not gitlab_gitlab_1)		==> to test~~
* ~~configure runner from docker-compose env (manually add token in config.toml) OR config.toml is defined as it and loaded into the runners that are not configured at all~~

* add registry (via gitlab)
* build from docker install node
* node script with docker api
* deploy stack from dcoker compose as json file (on commit for this one, read htat with node)

* node server KoaJs 
* api to POST stack as docker compose json file
  * git clone/git pull
  * add/update file
  * git commit; git push




