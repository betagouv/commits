#!/bin/bash

declare -a arr=("betagouv" "socialgouv" "mtes-mct" "incubateur-anct" "incubateur-ademe")

for i in "${arr[@]}"
do
   echo "$i"
   ./mirror-org.sh "$i"
   # or do whatever with individual element of the array
done