# Creo Multitoken Bridge

## Getting Started

Recommended Node version is 16.0.0.

```bash
$ yarn
$ yarn compile
$ yarn testf
```

## Project Structure

This a hardhat typescript project with `hardhat-deploy` extension.
Solidity version `0.8.18`

### Technologies Used

Node.js 16.0.0, Yarn 1.22, Hardhat 2.11.0, Hardhat Deploy 0.10.6, OpenZeppelin 4.9.6

### Tests

Tests are found in the `./test/` folder.

To run tests

```bash
$ yarn testf
```

To run coverage

```bash
$ yarn coverage
```

### Contracts

Solidity smart contracts are found in `./contracts/`.
`./contracts/mock` folder contains contracts mocks that are used for testing purposes.

### Deploy

Deploy script can be found in the `./deploy/localhost` for local testing and `./deploy/mainnet` for mainnet deploy

Generate `.env` file

```bash
$ cp .env.example .env
```

Add .env file to the project root.

To add the private key of a deployer account, assign the following variable

```
PRIVATE_TEST=
PRIVATE_MAIN=
```

To add API Keys for verifying

```
API_ETH=
API_BSC=
API_POLYGON=
API_AVAX=
API_FTM=
API_ARBITRUM=
```

To deploy contracts on `chain`

You need two initialize parameters: `bridgeAssistImplementation` (bridge assist contract address - implementation for proxy clones) and `owner` (address, who will have writes to give to someone role to create bridges, address who can set new bridge implementation, remove and add new bridges to the stored list).

```bash
$ yarn deploy --network 'chain'
```

### Deployments

Deployments on mainnets and testnets store in `./deployments`

### Verify

To verify contracts on `chain`

```bash
$ yarn verify --network 'chain'
```

### Setup

Setup is needed after bridge creating through the `BridgeFactory`.

Setup functions list (`BridgeAssist`):

1. funciton `setFee`(`feeSend_`, `feeFulfill_`)

   - `feeSend_` - amount of fee taken on sending from the contract, as fractions of 1/10000, e.g. 100 is 1%
   - `feeFulfill_` - amount of fee taken on fulfilling to the contract, as fractions of 1/10000, e.g. 100 is 1%

2. function `setFeeWallet`(`feeWallet_`)

   - `feeWallet_` - is new address to receive fees.

3. `setLimitPerSend`(`limitPerSend_`)

   - `limitPerSend_` - is new value of transfer limit.

4. `addChains`(`chains`, `exchangeRatesFrom`)

   - `chains` - string IDs of chains to allow interacting with from the contract
   - `exchangeRatesFrom` - array where exchangeRatesFrom[i] is the exchange rate the amount has to be multiplied by when
     fulfilled from chains[i] and divided by when sending to chains[i]

5. `setRelayers`(`relayers`, `relayerConsensusThreshold`)

   - `relayers` - an array of relayers who are trusted to relay information between chains. the array should contain no duplicates.
   - `relayerConsensusThreshold` - the amount of relayers that have to approve a transaction for it to be fulfilled

Funds are added to the bridge by transferring them to the `BridgeAssist` contract address.
**If there is not enough funds on the contract receiving funds will be impossible.**
The admins are supposed to keep enough liquidity on the both end of the bridge so that this does not happen.

## Test Coverage

```text
  BridgeAssist contract
setuping "BridgeFactory" ... setuped
    ✔ constructor requires (402ms)
    ✔ Re-initialize should revert (47ms)
    ✔ should send tokens (1123ms)
    ✔ should fulfill tokens from bridge preventing double-spend (948ms)
    ✔ multiple users test (1634ms)
    ✔ should take proper fee on fulfill and prevent double-spend (937ms)
    ✔ should not send with bad token (519ms)
    ✔ should not send over the limit (1002ms)
    ✔ should withdraw, pause, set chains, set parameters, set relayers and prevent using incorrect values (2248ms)
    ✔ the signature from bridge is invalid on other bridge (1108ms)

  BridgeFactory contract
    ✔ Should successfully change bridge implementation (107ms)
    Initializing
      ✔ Should execute initializer correctly (46ms)
      ✔ Initializer should revert (82ms)
      ✔ Re-initialize should revert (44ms)
    Creating bridge
      ✔ Should successfully create bridge (153ms)
      ✔ Creating bridge should revert due to the wrong creator (80ms)
    Adding/removing bridges
      ✔ Should successfully add new bridges (7975ms)
      ✔ Should successfully add bridges in 1 tx up to limit (7258ms)
      ✔ Adding new bridges should revert (6460ms)
      ✔ Should successfully remove bridges (7458ms)
      ✔ Should successfully remove bridges in 1 tx up to limit (8220ms)
      ✔ Removing bridges should revert (6477ms)

  CreoEngine contract
    ✔ constructor requires (103ms)
    ✔ set locked (62ms)
    ✔ transfer (50ms)


  25 passing (55s)

-----------------------|----------|----------|----------|----------|----------------|
File                   |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------------|----------|----------|----------|----------|----------------|
 contracts/            |      100 |      100 |      100 |      100 |                |
  BridgeAssist.sol     |      100 |      100 |      100 |      100 |                |
  BridgeFactory.sol    |      100 |      100 |      100 |      100 |                |
  CreoEngine.sol       |      100 |      100 |      100 |      100 |                |
 contracts/interfaces/ |      100 |      100 |      100 |      100 |                |
  IBridgeAssist.sol    |      100 |      100 |      100 |      100 |                |
-----------------------|----------|----------|----------|----------|----------------|
All files              |      100 |      100 |      100 |      100 |                |
-----------------------|----------|----------|----------|----------|----------------|
```

Contracts in contracts/mock/ will not be deployed to mainnet so they are not tested.

## Technical Requirements

The technical requirements are available [here](https://docs.google.com/document/d/1psKAR46IJzAKiSKOBxybOv1gLM493SsNKmFU-Bhshh8/edit?usp=sharing).

## Implementation Details

### Audit scope

The following files contain code that will be deployed on mainnet and thus require a security audit:

- `BridgeAssist.sol`
- `BridgeFactory.sol`

### Architecture

The project is a factory for creating bridges with different supported tokens.

`CREATOR_ROLE` holder can create centralized bridge implementation for some token. End-users of the bridge trust the bridge owner with their funds.

`DEFAULT_ADMIN_ROLE` holder can add new bridges to the stored list, remove bridge assists from the stored list and change the bridge assist implementation for deploying new bridges using `BridgeFactory` contract.

The system consists of `BridgeAssist` contract deployed on different chains (implementation for proxy clones) and `BridgeFactory` which allows you to create bridges (proxies) for different tokens.
The BridgeAssist has two main functions:

- `send` - receives tokens from user and stores all necessary transfer information.
- `fulfill` - allows user to get tokens he transfered on another chain.

Send and Fulfill emit SentTokens() and FulfilledTokens() events. They contain the sender address, the recipient
address, sending chain, receiving chain, amount and exchange rate applied. **NOTE: amount is the amount that gets
transferred to/from the bridge on the current chain, which may be different from the amount the user gets on the receiving chain.**

Addresses that can potentially be non-EVM addresses are stored as strings.

#### Exchange Rate

Exchange rate is a mechanism used to account for different decimals on different chains. Let's say our Solana token has
9 decimals, but our Ethereum token has 18. We can set exchange rate on Ethereum to 10\*\*9. The amount is divided by the
exchange rate during send and multiplied during fulfill, resulting in smooth conversion.

The send function checks that the amount is wholly divisible by the exchange rate to make sure no dust is left in
the contract.

#### Limit per send

Maximum amount provided as argument to send() is limited by the limit per send, changeable by the admin. The admin
should be able to set the limit to any number from 0 to infinity. The limit can be bypassed by sending several
transactions or using multicall, which is not a problem.

### Role Model

The `BridgeFactory` roles are:

- `Creator`: can create new bridges through the factory.
- `DefaultAdmin`: can grant/revoke `Creator` role, add/remove bridges, set new `BridgeAssist` implementation.

The `BridgeAssist` roles are:

- `Relayer`: proves information from other chains. Approval from multiple `relayers` is required for a piece of information
  to be considered truthful.
- `Manager`: can set fee, feeWallet, limitPerSend, pause/unpause contract and withdraw tokens from contract.
- `DefaultAdmin`: can grant/revoke `Manager` and `DefaultAdmin` roles.

### Backend

The backend stores the wallet private key, and sign with this key transaction information (struct Transaction) from `BridgeAssist` contract on first chain, after that user can call fulfill function with this signature and receive tokens on second chain, if signature and transaction data is valid. The backend wallet address neceserily has realayer role.

### Usage Scenarios

Below are detailed step-by-step usage scenarios. They may duplicate the ones described in the technical requirement document, but they are written with much more detail, i.e. who calls what function with what parameters, and where do these parameters come from.

#### Scenario 1

1. Creator calls `createBridgeAssist` function on the Ethereum Mainnet and Polygon.
2. User calls `send(amount, to)`, to - is chainId, and Ethereum BridgeAssist contract transferFrom tokens and store `Transaction` structure.
3. User goes to the frontend (or directly to the backend) and request `Transaction` structure `signature` from multiple
   relayers.
4. With the signatures and `Transaction` structure user goes to the Polygon BridgeAssist contract and calls fulfill(`Transaction`, `signature`) function, user gets his corresponding tokens amount.

#### Scenario 2

1. User calls send(amount, to) ,to - is chainId, and Ethereum BridgeAssist contract transferFrom tokens and store `Transaction` structure.
2. User goes to the frontend (or directly to the backend) and request `Transaction` structure `signature` from multiple
   relayers.
3. With the signatures and `Transaction` structure user goes to the Solana BridgeAssist contract and is able to
   claim his tokens there
