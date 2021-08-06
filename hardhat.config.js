require("@nomiclabs/hardhat-waffle");

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
    },
  mocha: {
    timeout: 60 * 3600 * 1000
  }
};
