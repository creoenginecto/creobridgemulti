import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BridgeAssist, Token__factory } from '@/typechain'

export async function disableInitializer(contract: string) {
  const INITIALIZERS_SLOT = 0
  const value = ethers.utils.hexlify(ethers.utils.zeroPad(BigNumber.from(0)._hex, 32))
  await ethers.provider.send('hardhat_setStorageAt', [
    contract,
    ethers.utils.hexValue(INITIALIZERS_SLOT),
    value,
  ])
}

export async function bridgeSetup(bridge: BridgeAssist, deployer: SignerWithAddress) {
  const managerRole = await bridge.MANAGER_ROLE()
  await bridge.connect(deployer).grantRole(managerRole, deployer.address)
  await bridge.connect(deployer).addChains(['NEAR', 'AVAX'], [9, 9])

  const token = Token__factory.connect(await bridge.TOKEN(), ethers.provider)
  await token.connect(deployer).transfer(bridge.address, '500_000'.toBigNumber())
}

export function accessControlError(account: string, role: string): string {
  return `AccessControl: account ${account.toLowerCase()} is missing role ${role.toLowerCase()}`
}
