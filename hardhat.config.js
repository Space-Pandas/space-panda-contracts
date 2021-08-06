require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

const privateKey = process.env.SPT_PRIVATE_KEY;
const etherscanKey = process.env.SPT_ETHERSCAN_KEY;

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
        gasPrice: 20000000000,
        accounts: {
            mnemonic: ''
        },
      },
      bsc: {
        url: "https://bsc-dataseed.binance.org/",
        chainId: 56,
        gasPrice: 20000000000,
          accounts: {
              mnemonic: ''
          },
      },
    },
  etherscan: {
    apiKey: "V54Z9F24KD1ZBIHH9ME51HZJZWACS7K8HV"
  },
  mocha: {
    timeout: 60 * 3600 * 1000,
  },
  etherscan: {
    apiKey: etherscanKey,
  },
};
