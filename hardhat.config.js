require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
const homedir = require('os').homedir();
const { PRIVATE_KEY, ETHERSCAN_APIKEY } = require(`${homedir}/env.json`);

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs, hre) => {
    const provider = hre.ethers.getDefaultProvider();
    const balance = await provider.getBalance(taskArgs.account);
    console.log(hre.ethers.utils.formatEther(balance));
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.6",
  networks: {
      hardhat: {
          accounts: {
              accountsBalance: "50000000000000000000000"
          }
      },
      bsc_testnet: {
        url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
        chainId: 97,
        accounts: [PRIVATE_KEY],
      },
      bsc: {
        url: "https://bsc-dataseed.binance.org/",
        chainId: 56,
        accounts: [PRIVATE_KEY],
      },
      rinkeby: {
        url: "https://rinkeby.infura.io/v3/ea975af343d542ef892aae29624d167a",
        chainId: 4,
        accounts: [PRIVATE_KEY],
        gasPrice: 20000000000,
      },
      main: {
        url: "https://mainnet.infura.io/v3/ea975af343d542ef892aae29624d167a",
        chainId: 1,
        accounts: [PRIVATE_KEY],
        gasPrice: 50000000000,
      },
    },
  etherscan: {
    apiKey: ETHERSCAN_APIKEY
  },
  mocha: {
    timeout: 60 * 3600 * 1000,
  },
};
