import { ethers } from 'hardhat'

import { BridgeFactory } from '@/typechain'
import { setup } from '@/gotbit-tools/hardhat'

const func = setup('BridgeFactory', async () => {
  const [deployer, relayer, , feeWallet, bridgeCreator] = await ethers.getSigners()

  const bridgeFactory = await ethers.getContract<BridgeFactory>('BridgeFactory')

  const creatorRole = await bridgeFactory.CREATOR_ROLE()
  const ownerRole = await bridgeFactory.BRIDGE_OWNER_ROLE()
  await bridgeFactory.connect(deployer).grantRole(creatorRole, bridgeCreator.address)
  await bridgeFactory.connect(deployer).grantRole(ownerRole, deployer.address)
})
export default func

func.tags = ['BridgeFactory.setup']
func.dependencies = ['BridgeFactory.deploy', 'BridgeAssist.deploy']
