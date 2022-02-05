#!/usr/bin/env bash

slither=$(pip3 freeze | grep slither-analyzer)

if [[ $slither != "slither-analyzer==0.8.1" ]]
then
    pip3 install slither-analyzer
fi

if [ ! -d "packages/contracts/node_modules/@openzeppelin" ]
then
    cp -rf node_modules/@openzeppelin packages/contracts/node_modules   
fi

yarn workspace @move-monorepo/contracts slither