import { BridgeAssist__factory, BridgeFactory__factory } from '../typechain'

// import { address as tokenAddress } from '../deployments/bsc_testnet/Token.json'
// import { address as bridgeFactoryAddress } from '../deployments/bsc_testnet/BridgeFactory_Proxy.json'

// import { address as tokenAddress } from '../deployments/avax_testnet/Token.json'
// import { address as bridgeFactoryAddress } from '../deployments/avax_testnet/BridgeFactory_Proxy.json'

import { address as tokenAddress } from '../deployments/polygon_testnet/Token.json'
import { address as bridgeFactoryAddress } from '../deployments/polygon_testnet/BridgeFactory_Proxy.json'

import { BigNumber, ethers } from 'ethers'

import dotenv from 'dotenv'
dotenv.config()

// const rpc = 'https://bsc-testnet-rpc.publicnode.com'
// const rpc = 'https://avalanche-fuji.blockpi.network/v1/rpc/public'
const rpc = 'https://polygon-mumbai-bor-rpc.publicnode.com'

const provider = new ethers.providers.JsonRpcProvider(rpc)
const wallet = new ethers.Wallet(process.env.PRIVATE_TEST!, provider)

async function main() {
  const factory = BridgeFactory__factory.connect(bridgeFactoryAddress, provider)

  const creatorRole = await factory.CREATOR_ROLE()
  const tx = await factory
    .connect(wallet)
    .grantRole(creatorRole, wallet.address, {
      // gasPrice: BigNumber.from(5).mul(BigNumber.from(10).pow(9)),
      // gasPrice: BigNumber.from(35).mul(BigNumber.from(10).pow(9)),
      gasPrice: BigNumber.from(2).mul(BigNumber.from(10).pow(9)),
    })
  console.log('Giving creator role to owner...')
  await tx.wait()
  console.log('Role is given\n')

  const bridgeAddress = await factory
    .connect(wallet)
    .callStatic.createBridgeAssist(
      tokenAddress,
      ethers.constants.MaxUint256,
      wallet.address,
      50,
      0,
      wallet.address,
      [wallet.address],
      1
    )
  const tx1 = await factory
    .connect(wallet)
    .createBridgeAssist(
      tokenAddress,
      ethers.constants.MaxUint256,
      wallet.address,
      50,
      0,
      wallet.address,
      [wallet.address],
      1,
      {
        // gasPrice: BigNumber.from(5).mul(BigNumber.from(10).pow(9)),
        // gasPrice: BigNumber.from(35).mul(BigNumber.from(10).pow(9)),
        gasPrice: BigNumber.from(2).mul(BigNumber.from(10).pow(9)),
      }
    )
  console.log(`Creating bridge: ${bridgeAddress}...`)
  await tx1.wait()
  console.log(`Created\n`)

  const bridge = await BridgeAssist__factory.connect(bridgeAddress, provider)
  const managerRole = await bridge.MANAGER_ROLE()

  const tx2 = await bridge
    .connect(wallet)
    .grantRole(managerRole, wallet.address, {
      // gasPrice: BigNumber.from(5).mul(BigNumber.from(10).pow(9)),
      // gasPrice: BigNumber.from(35).mul(BigNumber.from(10).pow(9)),
      gasPrice: BigNumber.from(2).mul(BigNumber.from(10).pow(9)),
    })
  console.log(`Giving manager role to owner...`)
  await tx2.wait()
  console.log(`Role is given\n`)

  const tx3 = await bridge.connect(wallet).addChains(
    // ['sol.devnet', 'evm.80001', 'evm.43113'],
    // ['sol.devnet', 'evm.80001', 'evm.97'],
    ['sol.devnet', 'evm.43113', 'evm.97'],
    [9, 0, 0],
    {
      // gasPrice: BigNumber.from(5).mul(BigNumber.from(10).pow(9)),
      // gasPrice: BigNumber.from(35).mul(BigNumber.from(10).pow(9)),
      gasPrice: BigNumber.from(2).mul(BigNumber.from(10).pow(9)),
    }
  )
  console.log(`Adding chains...`)
  await tx3.wait()
  console.log('Chains are added')
}

main()
