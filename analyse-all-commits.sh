#!/bin/bash

jq -c '.[]' ./repos/betagouv/beta.gouv.fr/commits.json | while read i; do
    echo $i
    ./analyse-commits.ts "$i" "${i%.json}-analysed.json"
done

