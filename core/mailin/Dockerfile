FROM node:latest


RUN apt-get update; apt-get install -y build-essential spamassassin spamc

# copy node app code
COPY app/package.json /root/app/package.json
RUN cd /root/app/; npm install;
COPY app /root/app/

# TODO configure spam stuff

ENTRYPOINT /root/app
CMD node app.js