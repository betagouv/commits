#!/bin/sh

# todo: exclude dirs
for dir in ./repos/*/*; do
    [ -d "$dir" ] && echo "Dossier : $dir"
    ./dump-repo-commits.ts "$dir" "$dir/commits.json"
done
