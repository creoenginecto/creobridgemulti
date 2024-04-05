import { deployments, ethers } from 'hardhat'

import { BridgeFactory, type BridgeAssist, type Token } from '@/typechain'

export const useContracts = async () => {
  return {
    token: await ethers.getContract<Token>('Token'),
    bridge: await ethers.getContract<BridgeAssist>('BridgeAssist'),
    bridgeFactory: await ethers.getContract<BridgeFactory>('BridgeFactory'),
  }
}

export const deploy = deployments.createFixture(async () => {
  await deployments.fixture(undefined, { keepExistingDeployments: true })
  return useContracts()
})
