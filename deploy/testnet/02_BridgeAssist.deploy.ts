import { ethers } from 'hardhat'
import type { DeployFunction } from 'hardhat-deploy/types'

import { wrapperHRE } from '@/gotbit-tools/hardhat'
import type { BridgeAssist__factory } from '@/typechain'
import { BigNumber } from 'ethers'

const func: DeployFunction = async (hre) => {
  const { deploy } = wrapperHRE(hre)
  const [deployer] = await ethers.getSigners()

  await deploy<BridgeAssist__factory>('BridgeAssist', {
    from: deployer.address,
    args: [],
    log: true,
    // gasPrice: BigNumber.from(30).mul(BigNumber.from(10).pow(9))
  })
}
export default func

func.tags = ['BridgeAssist.deploy']
