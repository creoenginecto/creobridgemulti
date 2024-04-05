import { HardhatUserConfig, task } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import 'hardhat-contract-sizer'
import 'hardhat-deploy'
import 'module-alias/register'

import '@/gotbit-tools/hardhat/init'
import { genNetworks, genCompilers } from '@/gotbit-tools/hardhat'

task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners()
  for (const account of accounts) {
    console.log(account.address)
  }
})

const config: HardhatUserConfig = {
  solidity: {
    compilers: genCompilers(['0.8.18']),
  },
  networks: {
    hardhat: {
      tags: ['localhost'],
      deploy: ['deploy/localhost/'],

      // tags: ['fork'],
      // deploy: ['deploy/fork/'],
      // forking: {
      //   url: 'https://rpc.ankr.com/bsc',
      // },
    },
    avax_testnet: {
      tags: ['testnet'],
      deploy: ['deploy/testnet/'],
      url: 'https://avalanche-fuji.blockpi.network/v1/rpc/public',
      accounts:
        process.env.PRIVATE_TEST === undefined ? [] : process.env.PRIVATE_TEST.split(','),
      verify: {
        etherscan: {
          apiKey: process.env.API_AVAX
        }
      }
    },
    ...genNetworks(),
    // place here any network you like (for overriding `genNetworks`)
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
  },
  mocha: {
    timeout: 200_000,
  },
}

export default config
