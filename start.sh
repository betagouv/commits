#!/bin/bash

set -e

mkdir repos || true

declare -a arr=("betagouv" "socialgouv" "mtes-mct" "incubateur-anct" "incubateur-ademe")

# fetch or update all GIT repos in ./repos
for i in "${arr[@]}"
do
   echo "$i"
   ./mirror-org.sh "$i"
done

# analyse all repos commits and create commits.json
# todo: exclude dirs
for dir in ./repos/*/*; do
    [ -d "$dir" ] && echo "Dossier : $dir"
    ./dump-repo-commits.ts "$dir" "$dir/commits.json"
done

# analyse all commits files and create commits-analysed.json
for commits in ./repos/*/*/commits.json; do
    [ -e "$commits" ] || continue 
    [ -f "${commits%.json}-analysed.json" ] || continue 
    echo "Analyse: $commits"
    ./analyse-commits.ts "$commits" "${commits%.json}-analysed.json"
done

