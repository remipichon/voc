# TODO

Should be in the issues with Zenhub

## Core
* ~~external_url to gitlab compose (gitlab.rb) ==> to test~~
* ~~name docker compose network (not gitlab_default) ==> to test~~
* ~~name gitlab container (not gitlab_gitlab_1)		==> to test~~
* ~~configure runner from docker-compose env (manually add token in config.toml) OR config.toml is defined as it and loaded into the runners that are not configured at all~~

* ~~build from docker:latest (job base image) install node~~
  * ~~from docker, add node OR from node add docker~~
  * ~~can dockerode deploy stack with compose file ?~~
  * ~~find a lib to read commit (which file ?, create/udpdate/delete ?)~~
* ~~node script with docker api~~
  * (~~docker exec with compose file~~ ~~OR __docker API with compose json)__~~
  
* what Gilab can do
  * ~~provision (build, ~~provision, update, delete) a stack from a Docker Compose file ~~(yml) (json)~~
     * ~~compose as json: docker-compose-ID.json~~
     * ~~stack-ID.json~~
        * ~~enable/disable~~
  * ~~manage build result du job~~
      * ~~https://docs.gitlab.com/ce/ci/yaml/README.html#artifacts~~
  * ~~build a lone image and~~ push it somewhere (~~build~~, ~~tag~~, push) ==> add registry
    * ~~Dockerfile + config json~~
* make nododocker be able to push to registry 
* review/comment/refact/document all Gitlab code
* ~~docker remote mode~~
* ~~automate install~~
~~==> install on server~~
* mail see #Mailing
  * branch out to Spring to forward attached file (write docs about how to use mailin, deal with multipart)==> Whatstat mail user stories
==> try out with Whatstat
* document dev mode (gitlab running locally, without mail, volume for node app)

## UI and user friendliness
* templating and definitons
  * support subdomain (DNS record needed)
  * support public access (no DSN record, http://<hotname>/<publicAccess>)
  * support git repo
     * Docker related file + conf on Gitlab's repo 
        * VOC pull the repo and use it as context for image and stack (same as having the Docker related files checked in at repo's root)
     * only conf on Gitlab's repo
        * VOC infers the Docker related file with the naming convention
        * VOC looks for the Docker related file in the whole repo, fails if more than one match
     * both case
        * conf support git repo + key/password as Gitlab secret
        * provide doc on how to trigger a VOC build when the source repo is updated (not the other way around, no pooling)
     
* Gitlab
  * trigger tasks (build, deploy) if the context is updated (tricky)
  * periodically garbage collect
  * custom action 
  * remove/kill services/tasks
  * fail job is one error  
  * gitlab-ci.yml base template
* NodeJs API  
  * node server KoaJs 

## Mailin
~~Build a proper image with all Mailin capabilities~~
~~https://hub.docker.com/r/craigmcdonald/docker-mailin/~/dockerfile/~~

* ~~node mediator app~~
  * ~~POST to endpoint with all relevant DATA as json and the attachements~~
     * ~~redirect to endoint~~ ~~according to recipient name~~
     * ~~redirect attachement as BASE64 to the POST to endpoint (read the 'content' var in mailin app, attachement are at the end~~
     * ~~provide a way to POST via CURL/Postman to test directly the server (not the mailin stuff)~~
  * test with big files
* doc: specific overlay network 'mail_network' to which endpoint server has to be part of  (add Docs)

## ~~refactoring~~
* ~~mailin app straight from mailin image with webhook to mediation app (simple Docker image with mailing and~~ spamassassin)
* ~~mediation app (nodejs + mediation app)~~
  * ~~read recipient to know where to redirect webhook~~
  * ~~POST to webhook the complete request~~