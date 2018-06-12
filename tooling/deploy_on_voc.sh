#!/bin/bash

function askParams(){
    default_gitlab_host=gitlab.remip.eu
    echo "Welcome to the wizard that will guide you through the process on building and deploying extra tools for VOC. All parameters are mandatory and not checked for null, please fill them ;)"
    echo ""

    echo "List of available tool"
    echo $(ls -d */)
    read -p "Which tool do you want to deploy? " tool_location
    if [[ ! -d "$tool_location" ]]; then
      echo "${tool_location} couldn't not be found (sorry, we are going to exit)"
      exit 1
    fi

    read -p "   Where is running your VOC instance ? hostname ${default_gitlab_host} (press enter) or override it with your own VOC (type it!): " given
    gitlab_host=${given:-$default_gitlab_host}

    printf "   Gitlab root password to create a user: "
    read -s gitlab_root_password
    echo ""

    echo "A tooling user will be created, you are free to name it the way you want. You can reuse an existing one. "
    read -p "   Demo user name: " new_user_name
    printf "   Demo user password: "
    read -s new_user_password
    echo ""
    printf "   Confirm emo user password: "
    read -s confirm_new_user_password
    if [[ "$confirm_new_user_password" != "$new_user_password" ]]; then
      echo ""
      echo "Password don't match (sorry, we are going to exit)"
      exit 1
    fi
    echo ""
    read -p "   Demo user email: " new_user_email
    read -p "   Demo repository: " new_user_repo
    echo ""
}

readApiToken(){
    gitlab_root_username=$1
    gitlab_root_password=$2
    token_request=$(curl --show-error --silent --request POST -H "Content-Type: application/json" \
    --data "{\"grant_type\":\"password\",\"username\":\"$gitlab_root_username\",\"password\": \"$gitlab_root_password\"}" \
    $gitlab_host/oauth/token || exit 1)

    token=$(echo $token_request | jq -r '.access_token')
    if [ "$token" = "null" ]; then
        echo $token_request
        exit 1
    fi;
    echo $token
}

queryGitlabApi(){
    api_token=$1
    endpoint=$2
    curl --silent --show-error --header "Authorization: Bearer ${api_token}" "http://${gitlab_host}/api/v4/${endpoint}" || exit 1
}

createGitlabUser(){
    username=$1
    name=$1
    password=$2
    email=$3
    curl --silent --show-error --header "Authorization: Bearer ${root_api_token}" \
        --request POST -H "Content-Type: application/json" \
        --data "{\"email\":\"$email\",\"password\":\"$password\",\"username\":\"$username\",\"name\":\"$name\",\"skip_confirmation\":\"true\"}" \
        "http://${gitlab_host}/api/v4/users" || exit 1
}

createGitlabGroup(){
    user_token=$1
    name=$2
    path=$2
    curl --silent --show-error --header "Authorization: Bearer ${user_token}" \
        --request POST -H "Content-Type: application/json" \
        --data "{\"name\":\"$name\",\"path\":\"$path\",\"visibility\":\"public\"}" \
        "http://${gitlab_host}/api/v4/groups" || exit 1
}

createGitlabProject(){
    user_token=$1
    name=$2
    curl --silent --show-error --header "Authorization: Bearer ${user_token}" \
        --request POST -H "Content-Type: application/json" \
        --data "{\"name\":\"$name\",\"visibility\":\"public\"}" \
        "http://${gitlab_host}/api/v4/projects" || exit 1
}

instantiateVocConfigurationRepo(){
    username=$1
    password=$2
    email=$3
    repo=$4
    tool=$5

    git config --global user.name "$username"
    git config --global user.email "$email"

    rm -rf $repo
    git clone "http://${username}:${password}@${gitlab_host}/${username}/${repo}.git" || exit 1
    cd ${repo}
    cp -af ${datadir}/${tool_location}/. .
    git add --all
    git commit -m "[do-all] add VOC configuration to build and deploy"
    git push -u origin master
}

function dialog_message(){
    dialog --title "Showtime ! Build and deploy WhatStat on VOC" \
    --timeout 200 --msgbox "$1" 40 80 2> /dev/null
}

function debugParameters(){
    echo "gitlab_root_password $gitlab_root_password"
    echo "new_user_name $new_user_name"
    echo "new_user_password $new_user_password"
    echo "new_user_email $new_user_email"
    echo "new_user_repo $new_user_repo"
    echo "gitlab_host $gitlab_host"
    echo "tool_location $tool_location"
    # admin/portainer_51
}

############################
##  Main
############################
clear

wordir=sandbox
datadir=$(pwd)
mkdir -p $wordir
cd $wordir

#askParams

gitlab_root_password=gitlabRootOnDabig
new_user_name=tool_user
new_user_password=tool_user_51
new_user_email=tool_user@mail.com
new_user_repo=portainer_config
gitlab_host=gitlab.remip.eu
tool_location=portainer

debugParameters


echo ""
echo "Configuration is done, here is a summary"
echo "      Using VOC running on '${gitlab_host}', tool ${tool_location} will be deployed via a Gitlab repository '${new_user_repo}' linked to the user '${new_user_name}' ('${new_user_email}')."
echo ""
echo "Now, lets appreciate..."
echo ""

echo "Using the root password to retrieve root token"
root_api_token=$(readApiToken 'root' $gitlab_root_password)
echo "      root api token is $root_api_token"
echo ""
echo "Using root token to create tools user ${new_user_name}"
echo "      response from Gitlab: $(createGitlabUser $new_user_name $new_user_password $new_user_email)"
echo "      existing users: "
echo $(queryGitlabApi $root_api_token '/users') | jq '.[].name'
echo ""
echo "Using tools user password to retrieve tools user token"
user_api_token=$(readApiToken $new_user_name $new_user_password)
echo "      new user api token is $user_api_token"
echo ""
echo "Using tools user token to create empty repository ${new_user_repo}"
echo "      response from Gitlab: $(createGitlabProject $user_api_token $new_user_repo) | jq '.'"
echo ""
echo "Git commit to ${new_user_repo} the VOC configuration files to build and deploy"
instantiateVocConfigurationRepo $new_user_name $new_user_password $new_user_email $new_user_repo $tool_location
echo ""
echo "*******************************************************************************"
echo "Debug:    http://${gitlab_host}/${new_user_name}/${new_user_repo}/-/jobs
    click on the most recent one, which should be 'running' or 'passed' and read the logs to see what VOC did for you. You can as well download the artifact to act on it with an external tool.

Access"
