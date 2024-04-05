import { ethers } from 'hardhat'
import type { DeployFunction } from 'hardhat-deploy/types'

import { wrapperHRE } from '@/gotbit-tools/hardhat'
import type { BridgeAssist, BridgeFactory__factory } from '@/typechain'
import { BigNumber } from 'ethers'

const func: DeployFunction = async (hre) => {
  const { deploy } = wrapperHRE(hre)
  const [deployer] = await ethers.getSigners()

  const bridgeAssist = await ethers.getContract<BridgeAssist>('BridgeAssist')

  await deploy<BridgeFactory__factory>('BridgeFactory', {
    from: deployer.address,
    proxy: {
      owner: deployer.address,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [bridgeAssist.address, deployer.address],
      },
    },
    log: true,
    // gasPrice: BigNumber.from(30).mul(BigNumber.from(10).pow(9))
  })
}
export default func

func.tags = ['BridgeFactory.deploy']
func.dependencies = ['BridgeAssist.deploy']
