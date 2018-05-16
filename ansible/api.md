**obsolete as API will get replaced by GraphQL**

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




