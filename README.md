# move-monorepo

## Packages
## Quickstart

### Install all dependencies

```sh
yarn && yarn run install
```

### Creating a .env file at the root

```sh
cp .env.sample .env
```

### Compile contracts

```sh
yarn contracts:compile
```

### Deploy contracts

Deploy contracts on rinkeby or ganache

```sh
yarn contracts:deploy rinkeby
```
OR
```sh
yarn contracts:deploy ganache
```
OR
```sh
yarn contracts:deploy mainnet
```
OR
```sh
yarn contracts:deploy kovan
```

Information about deploy, see in logs [logs/contracts](logs/contracts) 

### Verify contracts 

```sh
yarn contracts:verify rinkeby
```
OR
```sh
yarn contracts:verify mainnet
```
OR
```sh
yarn contracts:verify kovan
```


### Deploy subraph

Building subgraph and deploy on [https://thegraph.com](https://thegraph.com/en/)

Edit subgraph config file [packages/subgrpah/config/subgraph-config.json](packages/subgrpah/config/subgraph-config.json) 

Edit subgraph config in file [packages/subgrpah/subgraph.yaml](packages/subgrpah/subgraph.yaml) 

```sh
yarn subgraph:deploy
```

### Start ui

Creating a .env file at the [packages/ui](packages/ui)

```sh
 cp ./packages/ui/.env.sample .env
```
Fill in the necessary variables from [logs/contracts](logs/contracts) 

```sh
yarn ui:start
```

### Prettier

List problem files from all packages  

```sh
yarn prettier 
```

Fix prettier issues all packages 

```sh
yarn prettier:fix
```

### Eslint

```sh
yarn eslint 
```

### Slither

```sh
yarn slither
```

### Test

Run test in [@move-monorepo/contracts](packages/contracts)

```sh
yarn contracts:test
```

## Only droplet

```sh
docker-compose -f docker-compose.dev.yml up -d --build
```

## Enviroment variables 

Contracts: 

- `DAO_NAME`: The name of the DAO.
- `DAO_OWNER_ADDR`: The DAO Owner ETH Address (0x...) in the target network.
- `ETH_NODE_URL`: The Ethereum Node URL to connect to the Ethereum blockchain, it can be http/ws.
- `TRUFFLE_MNEMONIC`: The truffle mnemonic string containing the 12 keywords.
- `ETHERSCAN_API_KEY`: The Ether Scan API Key to verify the contracts after the deployment.
- `DEBUG_CONTRACT_VERIFICATION`: Debug the Ether Scan contract verification calls (`true`|`false`).
- `COUPON_CREATOR_ADDR`: The public eth (0x...) address of the creator of the onboarding coupons.
- `ERC20_TOKEN_NAME`: The ERC20 Token Name used by the ERC20 Token Extension.
- `ERC20_TOKEN_SYMBOL`: Token Symbol used by the ERC20 Token Extension.
- `ERC20_TOKEN_DECIMALS`: The ERC20 Token Decimals to display in MetaMask.
- `OFFCHAIN_ADMIN_ADDR`: The address of the admin account that manages the offchain voting adapter.
- `VOTING_PERIOD_SECONDS`: The maximum amount of time in seconds that members are allowed vote on proposals.
- `GRACE_PERIOD_SECONDS`: The minimum time in seconds after the voting period has ended, that the members need to wait before processing a proposal.
- `DAO_ARTIFACTS_OWNER_ADDR`: The owner address of the artifacts deployed. Leave it empty to if you want to use the `DAO_OWNER_ADDR` as the artifacts owner.
- `DAO_ARTIFACTS_CONTRACT_ADDR`: The `DaoArtifacts` contract address that will be used in the deployment script to fetch Adapters and Factories during the deployment to save gas costs.
- `UNAGII_DAI_VAULT_ADDRESS`: The `UnagiiVault` contract address
- `DAI_TOKEN`: The `DAI Token` address 

Snapshot-hub:

- `PORT`: The Snapshot hub Server port
- `ENV`: To indicate in which environment it is being executed: local, dev, or prod
- `USE_IPFS`: To indicated the pinning service on IPFS should be enabled/disabled (if enabled cause delay in the responses)
- `RELAYER_PK`: The PK of the account that will be used to sign the messages.
- `NETWORK`: The network name that will be used by the relayer (use testnet for: rinkeby or ropsten), and mainnet for the main eth network
- `JAWSDB_URL`: The postgres url: postgres://user:pwd@host:5432/db-name
- `PINNING_SERVICE`: You can use pinata or fleek
- `PINATA_SECRET_API_KEY`: Pinata API Secret key
- `PINATA_API_KEY`: Pinata API Key
- `FLEEK_API_KEY`: Fleek API Keys (you don't need to set Fleek and Pinata keys, pick only one pinning service)
- `FLEEK_API_SECRET`: Fleek API Secret key (you don't need to set Fleek and Pinata keys, pick only one pinning service)
- `ALLOWED_DOMAINS`: The list of domains that should be allowed to send requests to the API
- `ALCHEMY_API_URL`: The relayer API (alternative to Infura)

Subgraph: 
- `GRAPH_ACCESS_TOKEN`:  For testnet (rinkeby, ropsten, etc)
- `GRAPH_DEPLOYMENT_KEY`: For mainnet

Twitter:
- `CONSUMER_KEY`: Twitter access key
- `CONSUMER_SECRET`: Twitter secret key
- `CONSUMER_BEARER`: Twitter bearer token
- `REDIRECT_URL`: Redirect url if success auth in twitter
