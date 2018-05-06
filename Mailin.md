# Mailin
Voc can receive emails sent to XXX@subdomain.domain.com (following naming of Mailin doc) and redirect them to the webhook service of choice over HTTP. 

## DNS configuration
DNS record are needed to properly receive mail. Please follow "The crux: setting up your DNS correctly" from [Mailin Doc](http://mailin.io/doc)

## Compose for webhook service
Your email webhook (said 'mail_webhook') service should be part of the _mail_ network, following the Docker Compose for your service
````
services:
  mail_webhook:
    networks:
      - voc_mail

networks:
  voc_mail:
    external: true
````

## Configure forwarding to your webhook service
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


## Implement the email webhook
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

## SpringBoot impl
SpringBoot implementation with type=file [https://github.com/remipichon/WhatsAppElastic](https://github.com/remipichon/WhatsAppElastic/blob/master/app/src/main/java/co/paan/controller/ConversationRestController.java#L73)

## NodeJs impl
NodeJs with _request_ module for type=field [https://github.com/remipichon/voc](https://github.com/remipichon/voc/blob/master/core/test/mock-mail-endpoint/server.js#L19)

