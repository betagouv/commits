#!/bin/bash

org="$1"

if [ -z $org ]; then
	echo "Usage: $0 <organisation>"
	exit 1
fi

pushd repos

mkdir -p $org
pushd $org

# todo: fetch ALL repos
for repo in $(curl -v -s "https://api.github.com/orgs/$org/repos?per_page=100&type=sources" 2>&1 | grep '"full_name": "*"' | cut -d':' -f2 | sed s'/,$//' | sed s'/"//g' ); do
    echo $repo
	filename=$(echo "$repo" | cut -d'/' -f2)
	if [ -e $filename ]; then
		pushd $filename
		git pull
        # todo: reclone on error
		popd
	else
		git clone git@github.com:$repo.git
	fi
done

popd

popd

