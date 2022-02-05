#!/usr/bin/env bash

docker network rm 'web' >& /dev/null
docker network create 'web'