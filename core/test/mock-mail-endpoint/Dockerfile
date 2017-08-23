FROM node:latest

USER root

RUN apt-get update;

# copy node app code
COPY package.json package.json
RUN npm install;
COPY server.js server.js


CMD node server.js