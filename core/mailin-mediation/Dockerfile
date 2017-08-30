FROM node:latest

USER root

# copy node app code
COPY app/package.json /app/package.json
RUN cd /app/; npm install;
COPY app /app/

EXPOSE 80

ENTRYPOINT cd /app; node app.js