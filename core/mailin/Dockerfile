FROM node:latest

USER root

RUN apt-get update; apt-get install -y build-essential spamassassin spamc rsyslog
RUN npm install -g mailin

COPY entrypoint.sh entrypoint.sh

EXPOSE 25

ENTRYPOINT ["sh","entrypoint.sh"]