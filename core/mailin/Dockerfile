FROM node:latest

USER root

RUN apt-get update; apt-get install -y build-essential spamassassin spamc

# copy node app code
COPY app/package.json /app/package.json
RUN cd /app/; npm install;
COPY app /app/

# TODO configure spam stuff

ENTRYPOINT cd /app; node app.js
