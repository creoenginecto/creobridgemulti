import { ethers } from 'hardhat'
import { expect } from 'chai'

import { useContracts, deploy } from '@/test'
import {
  BridgeAssist__factory,
  BridgeFactory__factory,
  OldBridgeAssist__factory,
} from '@/typechain'
import { accessControlError, disableInitializer } from './utils/utils'
import {
  DEFAULT_FEE_FULFILL,
  DEFAULT_FEE_SEND,
  DEFAULT_LIMIT_PER_SEND,
  DEFAULT_RELAYER_CONSENSUS_THRESHOLD,
} from './utils/constants'
import { ERRORS } from './utils/errors'
import { BigNumber } from 'ethers'

const GAS_LIMIT_PER_BLOCK = BigNumber.from(20_000_000)

describe('BridgeFactory contract', () => {
  beforeEach(async () => {
    await deploy()
  })
  describe('Initializing', () => {
    it('Should execute initializer correctly', async () => {
      const { bridgeFactory, bridge } = await useContracts()
      const [deployer] = await ethers.getSigners()

      expect(await bridgeFactory.bridgeAssistImplementation()).eq(
        bridge.address
      )

      const defaultAdminRole = await bridgeFactory.DEFAULT_ADMIN_ROLE()
      expect(await bridgeFactory.hasRole(defaultAdminRole, deployer.address))
        .true
    })
    it('Initializer should revert', async () => {
      const { bridge } = await useContracts()
      const [deployer] = await ethers.getSigners()

      const bridgeFactoryFactory: BridgeFactory__factory =
        await ethers.getContractFactory('BridgeFactory', deployer)

      const bridgeFactory = await bridgeFactoryFactory
        .connect(deployer)
        .deploy()
      await disableInitializer(bridgeFactory.address)

      await expect(
        bridgeFactory
          .connect(deployer)
          .initialize(ethers.constants.AddressZero, deployer.address)
      ).revertedWith(ERRORS.zeroBridgeImplementation)
      await expect(
        bridgeFactory
          .connect(deployer)
          .initialize(bridge.address, ethers.constants.AddressZero)
      ).revertedWith(ERRORS.ownerZeroAddress)
    })
    it('Re-initialize should revert', async () => {
      const { bridge, bridgeFactory } = await useContracts()
      const [deployer, user] = await ethers.getSigners()

      await expect(
        bridgeFactory.connect(deployer).initialize(bridge.address, user.address)
      ).revertedWith(ERRORS.initialized)
    })
  })
  describe('Creating bridge', () => {
    it('Should successfully create bridge', async () => {
      const { bridgeFactory, token } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const defaultAdminRole = await bridgeFactory.DEFAULT_ADMIN_ROLE()
      const ownerRole = await bridgeFactory.BRIDGE_OWNER_ROLE()

      await bridgeFactory.grantRole(ownerRole, bridgeCreator.address)

      const bridgeAddr = await bridgeFactory
        .connect(bridgeCreator)
        .callStatic.createBridgeAssist(
          token.address,
          DEFAULT_LIMIT_PER_SEND,
          feeWallet.address,
          DEFAULT_FEE_SEND,
          DEFAULT_FEE_FULFILL,
          bridgeCreator.address,
          [relayer.address],
          DEFAULT_RELAYER_CONSENSUS_THRESHOLD
        )
      await bridgeFactory
        .connect(bridgeCreator)
        .createBridgeAssist(
          token.address,
          DEFAULT_LIMIT_PER_SEND,
          feeWallet.address,
          DEFAULT_FEE_SEND,
          DEFAULT_FEE_FULFILL,
          bridgeCreator.address,
          [relayer.address],
          DEFAULT_RELAYER_CONSENSUS_THRESHOLD
        )

      expect(await bridgeFactory.getCreatedBridgesLength()).eq(1)
      const createdBridgeInfo = (
        await bridgeFactory.getCreatedBridgesInfo(0, 1)
      )[0]
      expect(createdBridgeInfo.bridgeAssist).eq(bridgeAddr)
      expect(createdBridgeInfo.token).eq(token.address)

      const createdBridgeInfoByIndex = await bridgeFactory.getCreatedBridgeInfo(
        0
      )
      expect(createdBridgeInfoByIndex.bridgeAssist).eq(bridgeAddr)
      expect(createdBridgeInfoByIndex.token).eq(token.address)

      const createdBridge = BridgeAssist__factory.connect(
        bridgeAddr,
        ethers.provider
      )
      expect(await createdBridge.TOKEN()).eq(token.address)
      expect(await createdBridge.limitPerSend()).eq(DEFAULT_LIMIT_PER_SEND)
      expect(await createdBridge.feeWallet()).eq(feeWallet.address)
      expect(await createdBridge.feeSend()).eq(DEFAULT_FEE_SEND)
      expect(await createdBridge.feeFulfill()).eq(DEFAULT_FEE_FULFILL)
      expect(
        await createdBridge.hasRole(defaultAdminRole, bridgeCreator.address)
      ).true
      expect(await createdBridge.getRelayers()).deep.eq([relayer.address])
      expect(await createdBridge.relayerConsensusThreshold()).eq(
        DEFAULT_RELAYER_CONSENSUS_THRESHOLD
      )
    })
    it('Creating bridge should revert due to the wrong creator', async () => {
      const { bridgeFactory, token } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const creatorRole = await bridgeFactory.CREATOR_ROLE()
      await expect(
        bridgeFactory
          .connect(deployer)
          .createBridgeAssist(
            token.address,
            DEFAULT_LIMIT_PER_SEND,
            feeWallet.address,
            DEFAULT_FEE_SEND,
            DEFAULT_FEE_FULFILL,
            bridgeCreator.address,
            [relayer.address],
            DEFAULT_RELAYER_CONSENSUS_THRESHOLD
          )
      ).revertedWith(ERRORS.accessControl(deployer.address, creatorRole))
    })
  })
  describe('Adding/removing bridges', () => {
    it('Should successfully add new bridges', async () => {
      const { bridgeFactory, token } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const oldBridgeFactory: OldBridgeAssist__factory =
        await ethers.getContractFactory('OldBridgeAssist', deployer)
      let bridgesAddresses: string[] = []

      const bridgesNum = await (
        await bridgeFactory.ADD_REMOVE_LIMIT_PER_TIME()
      ).toNumber()
      for (let index = 0; index < bridgesNum; index++) {
        const bridgeDeployed = await oldBridgeFactory
          .connect(deployer)
          .deploy(
            token.address,
            ethers.utils.parseEther('100'),
            feeWallet.address,
            0,
            0,
            deployer.address,
            [relayer.address],
            1
          )
        bridgesAddresses.push(bridgeDeployed.address)
      }
      await bridgeFactory.connect(deployer).addBridgeAssists(bridgesAddresses)

      await expect(bridgeFactory.getCreatedBridgesInfo(0, 0)).revertedWith(
        ERRORS.zeroLimit
      )

      expect(await bridgeFactory.getCreatedBridgesLength()).eq(bridgesNum)
      const bridgesInfo = await bridgeFactory.getCreatedBridgesInfo(0, 2)

      expect(bridgesInfo[0].bridgeAssist).eq(bridgesAddresses[0])
      expect(bridgesInfo[0].token).eq(token.address)
      expect(bridgesInfo[1].bridgeAssist).eq(bridgesAddresses[1])
      expect(bridgesInfo[1].token).eq(token.address)

      expect(await bridgeFactory.getBridgesByTokenLength(token.address)).eq(
        bridgesNum
      )
      const bridgesByToken = await bridgeFactory.getBridgesByToken(
        token.address,
        0,
        bridgesNum
      )
      expect(bridgesByToken[0]).eq(bridgesInfo[0].bridgeAssist)
      expect(bridgesByToken[1]).eq(bridgesInfo[1].bridgeAssist)

      const bridgeByToken = await bridgeFactory.getBridgeByToken(
        token.address,
        0
      )
      expect(bridgeByToken).eq(bridgesByToken[0])

      await expect(
        bridgeFactory.getBridgeByToken(ethers.constants.AddressZero, 0)
      ).revertedWith(ERRORS.tokenZeroAddress)
      await expect(
        bridgeFactory.getBridgeByToken(token.address, 100)
      ).revertedWith(ERRORS.invalidIndex)

      await expect(
        bridgeFactory.getBridgesByToken(ethers.constants.AddressZero, 0, 1)
      ).revertedWith(ERRORS.tokenZeroAddress)
      await expect(
        bridgeFactory.getBridgesByToken(token.address, 0, 0)
      ).revertedWith(ERRORS.zeroLimit)

      await expect(
        bridgeFactory.getBridgesByToken(deployer.address, 0, 10)
      ).revertedWith(ERRORS.invalidOffsetLimit)
      await expect(bridgeFactory.getCreatedBridgesInfo(0, 101)).revertedWith(
        ERRORS.invalidOffsetLimit
      )
      await expect(bridgeFactory.getCreatedBridgeInfo(100)).revertedWith(
        ERRORS.invalidIndex
      )
      await expect(
        bridgeFactory.getBridgeByToken(token.address, 100)
      ).revertedWith(ERRORS.invalidIndex)
    })
    it('Should successfully add bridges in 1 tx up to limit', async () => {
      const { bridgeFactory, token, bridge } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const oldBridgeFactory: OldBridgeAssist__factory =
        await ethers.getContractFactory('OldBridgeAssist', deployer)
      let bridgesAddresses: string[] = []

      const bridgesNum = await (
        await bridgeFactory.ADD_REMOVE_LIMIT_PER_TIME()
      ).toNumber()
      for (let index = 0; index < bridgesNum; index++) {
        const bridgeDeployed = await oldBridgeFactory
          .connect(deployer)
          .deploy(
            token.address,
            ethers.utils.parseEther('100'),
            feeWallet.address,
            0,
            0,
            deployer.address,
            [relayer.address],
            1
          )
        bridgesAddresses.push(bridgeDeployed.address)
      }

      const tx = bridgeFactory
        .connect(deployer)
        .addBridgeAssists(bridgesAddresses)
      await expect(tx).not.reverted
      expect((await (await tx).wait()).gasUsed).lt(GAS_LIMIT_PER_BLOCK)
    })
    it('Adding new bridges should revert', async () => {
      const { bridgeFactory, token, bridge } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const oldBridgeFactory: OldBridgeAssist__factory =
        await ethers.getContractFactory('OldBridgeAssist', deployer)
      let bridgesAddresses: string[] = []

      const bridgesNum =
        (await (await bridgeFactory.ADD_REMOVE_LIMIT_PER_TIME()).toNumber()) + 1
      for (let index = 0; index < bridgesNum; index++) {
        const bridgeDeployed = await oldBridgeFactory
          .connect(deployer)
          .deploy(
            token.address,
            ethers.utils.parseEther('100'),
            feeWallet.address,
            0,
            0,
            deployer.address,
            [relayer.address],
            1
          )
        bridgesAddresses.push(bridgeDeployed.address)
      }

      await expect(
        bridgeFactory.connect(deployer).addBridgeAssists(bridgesAddresses)
      ).revertedWith(ERRORS.arrayLengthExceedsLimit)
      await expect(
        bridgeFactory.connect(deployer).addBridgeAssists([])
      ).revertedWith(ERRORS.zeroLengthArray)

      await expect(
        bridgeFactory
          .connect(deployer)
          .addBridgeAssists([ethers.constants.AddressZero])
      ).revertedWith(ERRORS.bridgeZeroAddressAtIndex(0))
      await expect(
        bridgeFactory
          .connect(deployer)
          .addBridgeAssists([bridgesAddresses[0], ethers.constants.AddressZero])
      ).revertedWith(ERRORS.bridgeZeroAddressAtIndex(1))
      await expect(
        bridgeFactory
          .connect(deployer)
          .addBridgeAssists([bridgesAddresses[0], bridgesAddresses[0]])
      ).revertedWith(ERRORS.bridgeDuplicateAtIndex(1))
      await expect(
        bridgeFactory.connect(deployer).addBridgeAssists([bridge.address])
      ).revertedWith(ERRORS.tokenZeroAddressAtIndex(0))
    })
    it('Should successfully remove bridges', async () => {
      const { bridgeFactory, token } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const oldBridgeFactory: OldBridgeAssist__factory =
        await ethers.getContractFactory('OldBridgeAssist', deployer)
      let bridgesAddresses: string[] = []

      const bridgesNum = await (
        await bridgeFactory.ADD_REMOVE_LIMIT_PER_TIME()
      ).toNumber()
      for (let index = 0; index < bridgesNum; index++) {
        const bridgeDeployed = await oldBridgeFactory
          .connect(deployer)
          .deploy(
            token.address,
            ethers.utils.parseEther('100'),
            feeWallet.address,
            0,
            0,
            deployer.address,
            [relayer.address],
            1
          )
        bridgesAddresses.push(bridgeDeployed.address)
      }

      const defaultAdminRole = await bridgeFactory.DEFAULT_ADMIN_ROLE()

      await expect(
        bridgeFactory.connect(relayer).addBridgeAssists(bridgesAddresses)
      ).revertedWith(ERRORS.accessControl(relayer.address, defaultAdminRole))
      await bridgeFactory.connect(deployer).addBridgeAssists(bridgesAddresses)

      await bridgeFactory
        .connect(deployer)
        .removeBridgeAssists([bridgesAddresses[0]])
      expect(await bridgeFactory.getCreatedBridgesLength()).eq(bridgesNum - 1)

      const createdBridges = await bridgeFactory.getCreatedBridgesInfo(
        0,
        bridgesNum - 1
      )
      for (let index = 0; index < createdBridges.length; index++) {
        expect(createdBridges[index].bridgeAssist).not.eq(bridgesAddresses[0])
      }
    })
    it('Should successfully remove bridges in 1 tx up to limit', async () => {
      const { bridgeFactory, token, bridge } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const oldBridgeFactory: OldBridgeAssist__factory =
        await ethers.getContractFactory('OldBridgeAssist', deployer)
      let bridgesAddresses: string[] = []

      const bridgesNum = await (
        await bridgeFactory.ADD_REMOVE_LIMIT_PER_TIME()
      ).toNumber()
      for (let index = 0; index < bridgesNum; index++) {
        const bridgeDeployed = await oldBridgeFactory
          .connect(deployer)
          .deploy(
            token.address,
            ethers.utils.parseEther('100'),
            feeWallet.address,
            0,
            0,
            deployer.address,
            [relayer.address],
            1
          )
        bridgesAddresses.push(bridgeDeployed.address)
      }

      await bridgeFactory.connect(deployer).addBridgeAssists(bridgesAddresses)
      const tx = bridgeFactory
        .connect(deployer)
        .removeBridgeAssists(bridgesAddresses)
      await expect(tx).not.reverted
      expect((await (await tx).wait()).gasUsed).lt(GAS_LIMIT_PER_BLOCK)
    })
    it('Removing bridges should revert', async () => {
      const { bridgeFactory, token, bridge } = await useContracts()
      const [deployer, relayer, , feeWallet, bridgeCreator] =
        await ethers.getSigners()

      const oldBridgeFactory: OldBridgeAssist__factory =
        await ethers.getContractFactory('OldBridgeAssist', deployer)
      let bridgesAddresses: string[] = []

      const bridgesNum =
        (await (await bridgeFactory.ADD_REMOVE_LIMIT_PER_TIME()).toNumber()) + 1
      for (let index = 0; index < bridgesNum; index++) {
        const bridgeDeployed = await oldBridgeFactory
          .connect(deployer)
          .deploy(
            token.address,
            ethers.utils.parseEther('100'),
            feeWallet.address,
            0,
            0,
            deployer.address,
            [relayer.address],
            1
          )
        bridgesAddresses.push(bridgeDeployed.address)
      }

      const defaultAdminRole = await bridgeFactory.DEFAULT_ADMIN_ROLE()

      await expect(
        bridgeFactory.connect(deployer).removeBridgeAssists(bridgesAddresses)
      ).revertedWith(ERRORS.arrayLengthExceedsLimit)
      await expect(
        bridgeFactory.connect(deployer).removeBridgeAssists([])
      ).revertedWith(ERRORS.zeroLengthArray)
      await expect(
        bridgeFactory
          .connect(deployer)
          .removeBridgeAssists([ethers.constants.AddressZero])
      ).revertedWith(ERRORS.bridgeNotFoundAtIndex(0))

      await expect(
        bridgeFactory
          .connect(relayer)
          .removeBridgeAssists([ethers.constants.AddressZero])
      ).revertedWith(ERRORS.accessControl(relayer.address, defaultAdminRole))
    })
  })
  it('Should successfully change bridge implementation', async () => {
    const { bridgeFactory, token, bridge } = await useContracts()
    const [deployer, relayer, , feeWallet, bridgeCreator] =
      await ethers.getSigners()

    const defaultAdminRole = await bridgeFactory.DEFAULT_ADMIN_ROLE()
    await expect(
      bridgeFactory
        .connect(relayer)
        .changeBridgeAssistImplementation(token.address)
    ).revertedWith(ERRORS.accessControl(relayer.address, defaultAdminRole))

    await expect(
      bridgeFactory
        .connect(deployer)
        .changeBridgeAssistImplementation(ethers.constants.AddressZero)
    ).revertedWith(ERRORS.zeroBridgeImplementation)
    await bridgeFactory
      .connect(deployer)
      .changeBridgeAssistImplementation(token.address) // token is invalid implementation (only for tests)
    expect(await bridgeFactory.bridgeAssistImplementation()).eq(token.address)
  })
})
