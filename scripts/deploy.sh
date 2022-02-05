#!/usr/bin/env bash
date=`date '+%F_%T'`

if [[ "$1" == "localhost" ]]; then
    yarn workspace @move-monorepo/contracts deploy:"$1" 2>&1 | tee "./logs/contracts/deploy_localhost_${date}.log" 
fi

if [[ "$1" == "rinkeby" ]]; then
    yarn workspace @move-monorepo/contracts deploy:"$1" 2>&1 | tee "./logs/contracts/deploy_rinkeby_${date}.log" 
fi

if [[ "$1" == "mainnet" ]]; then
    yarn workspace @move-monorepo/contracts deploy:"$1" 2>&1 | tee "./logs/contracts/deploy_mainnet_${date}.log" 
fi

if [[ "$1" == "kovan" ]]; then
    yarn workspace @move-monorepo/contracts deploy:"$1" 2>&1 | tee "./logs/contracts/deploy_mainnet_${date}.log" 
fi