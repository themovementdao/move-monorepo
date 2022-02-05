#!/usr/bin/env bash

mkdir -p "./packages/contracts/build/sources"
mkdir -p "./packages/contracts/build/contracts"
mkdir -p "./packages/contracts/contracts"

cp -R -a "./thirdparty/tribute-contracts/contracts/." "./packages/contracts/build/sources"
cp -R -a "./packages/contracts/contracts/." "./packages/contracts/build/sources"

yarn workspace @move-monorepo/contracts compile