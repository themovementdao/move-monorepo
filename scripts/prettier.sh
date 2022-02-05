#!/usr/bin/env bash

if [[ "$1" = "fix" ]]
then
    echo "######################## Start fix prettier in @move-monorepo/contracts ##############################"
    yarn workspace @move-monorepo/contracts prettier:fix
    echo "######################## Start fix prettier in @move-monorepo/subgraph  ##############################"
    yarn workspace @move-monorepo/subgraph prettier:fix
    echo "######################## Start fix prettier in @move-monorepo/ui ##############################"
    yarn workspace @move-monorepo/ui prettier:fix
else
    echo "######################## Start check prettier in @move-monorepo/contracts ##############################"
    yarn workspace @move-monorepo/contracts prettier
    echo "######################## Start check prettier in @move-monorepo/subgraph  ##############################"
    yarn workspace @move-monorepo/subgraph prettier
    echo "######################## Start check prettier in @move-monorepo/ui ##############################"
    yarn workspace @move-monorepo/ui prettier
fi


