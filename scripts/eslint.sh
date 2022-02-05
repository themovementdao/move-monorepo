#!/usr/bin/env bash

echo "######################## Start eslint in @move-monorepo/contracts ##############################"
yarn workspace @move-monorepo/contracts eslint
echo "######################## Start eslintin @move-monorepo/subgraph  ##############################"
yarn workspace @move-monorepo/subgraph eslint
echo "######################## Start eslint in @move-monorepo/ui ##############################"
yarn workspace @move-monorepo/ui eslint