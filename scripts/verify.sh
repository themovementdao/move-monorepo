#!/usr/bin/env bash
date=`date '+%F_%T'`

yarn workspace @move-monorepo/contracts verify --network "$1"