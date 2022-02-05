#!/usr/bin/env bash
date=`date '+%F_%T'`

echo "************ Create contacts folder in subgraph ****************"
mkdir ./packages/subgraph/contracts

echo "************ Copy contracts in subgraph ****************"
cp -rf ./packages/contracts/build/contracts/. ./packages/subgraph/contracts
cp ./packages/contracts/artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json ./packages/subgraph/contracts
touch "./packages/subgraph/subgraph.yaml"

yarn workspace @move-monorepo/subgraph subgraph 2>&1 | tee "./logs/subgraph/deploy_${date}.log" 