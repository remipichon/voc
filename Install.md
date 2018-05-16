# Install

VOC can be brought to you in two flavors whether you want the full VOC or just the VOC build and deploy capabilities. 

The full VOC brings you:
* configured Gitlab with Gitlab runner enabled
* one or two Runner to work in local or remote mode
* Nginx with service discovery to expose your service as Ingress
* Mail server to redirect incoming mail to your configured stack
* more to come


The build and deploy features are available via a Docker image that can be run by a Gitlab Runner. Nothing more, just a 
few GitlabCI configuration and you are ready. 



## Ansible install (preferred)

```bash
ansible-playbook -i herencgracht.host ansible/deploy_configure.yml -e mode=host -e hostname=gitlab.remip.eu -e gitlab_root_password=rootroot
ansible-playbook -i herencgracht.host ansible/wait_for_gitlab.yml
ansible-playbook -i herencgracht.host ansible/add_runner.yml -e hostname=gitlab.remip.eu -e runner_token=GNhcsYvUpUoZS48xusmG
```

* mode: can be 'host', 'remote' or 'both'. 'remote' needs proper certificates to reach the remote Docker daemon
* hostname: DNS record pointing to your host, it can be its IP. It's just less fancy but everything will work the same (expect the email feature)
* gitlab_root_password: admin username will be 'root', can specify which password do you want. Do not update it before Ansible is done configuring
* runner_token: so far, you need to fetch the runner token from /admin/runers
* see [DNS configuration](Mailin.md#dns-configuration) to enable the mail server
* see [Remote Docker](Config-Runner.md#remote-docker) on how to configure your certs (but don't follow the exec part, it's done by Ansible)


## Runner only install

You already have a Gitlab and only want to get the build and deploy capabilities?
 
You first need a running Gitlab8 with a Gitlab Runner configured. See (https://docs.gitlab.com/runner/install/index.html)[https://docs.gitlab.com/runner/install/index.html]. 
I recommend the 'Install as Docker Service' but it's up to you. 

Then configure a new Runner. For local mode, the Runner image is __vocproject/nodedocker__ and should use at least '/var/run/docker.sock' as volume. 
For remote mode, the Runner image has to be built with the Docker certificates, no need for the Docker socket. 

See examples at [Add a runner](Manual-Config-Runner.md#add-a-runner). 



## Manual install

See [Manual Install](Manual-Install.md)