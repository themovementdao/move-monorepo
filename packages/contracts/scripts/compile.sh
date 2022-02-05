#!/usr/bin/env bash
rm -rf "./build/sources"

mkdir -p "./build/sources"

cp -R -a "../../thirdparty/tribute-contracts/contracts/." "./build/sources"
cp -R -a "./contracts/." "./build/sources"

npx hardhat clean
npx hardhat compile