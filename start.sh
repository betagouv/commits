#!/bin/bash

set -e

./mirror-orgs.sh
./dump-repos-commits.sh
./analyse-all-commits.sh
