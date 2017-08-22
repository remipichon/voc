FROM node:latest

USER root

RUN apt-get update;

# copy node app code
COPY package.json /root/app/package.json
RUN cd /root/app/; npm install;
COPY app server.js


ENTRYPOINT /root/app
CMD node server.js