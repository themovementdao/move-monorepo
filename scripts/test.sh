#!/usr/bin/env bash

function test_contracts () {
    echo "######################## Start test in @move-monorepo/contracts ##############################"
    yarn workspace @move-monorepo/contracts test
}

function test_ui () {
    echo "######################## Start test in @move-monorepo/ui ##############################"
    yarn workspace @move-monorepo/ui test
}

function test_vault () {
    echo "######################## Start test in unagii-vault-v2 ##############################"
    source .venv/bin/activate
    yarn workspace unagii-vault-v2 test
}

if [[ "$1" = "@move-monorepo/contracts" ]]
then
    test_contracts
    exit 1
fi   

if [[ "$1" = "@move-monorepo/ui" ]]
then
    test_ui
    exit 1
fi

if [[ "$1" = "unagii-vault-v2" ]]  
then
    test_vault
else
    test_contracts
    test_ui
    test_vault
fi