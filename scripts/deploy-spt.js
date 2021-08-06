const { ethers } = require("hardhat");
require("hardhat");

async function main() {
  const Spt = await ethers.getContractFactory("SpacePandaToken");
  const spt = await Spt.deploy({
    nonce: 0,
  });
  // const spt = await Spt.attach("0xed4ecb4a38bf8ba8794a57c98c2ce402fc5a385b");
  console.log("spt deployed to:", spt.address);
  //admin
  await spt.grantRole(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0a0da478655adDac86222e0De76641668cBd6df4",
    {
      nonce: 1,
    }
  );

  // minter
  await spt.grantRole(
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
    "0x0a0da478655adDac86222e0De76641668cBd6df4",
    {
      nonce: 2,
    }
  );

  // pauser
  await spt.grantRole(
    "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a",
    "0x0a0da478655adDac86222e0De76641668cBd6df4",
    {
      nonce: 3,
    }
  );

  await spt.renounceRole(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0a0dafddce3c5c9d314df6f1225cabf819dfbabc",
    {
      gasLimit: 1_000_000,
    }
  );
  await spt.renounceRole(
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
    "0x0a0dafddce3c5c9d314df6f1225cabf819dfbabc",
    {
      gasLimit: 1_000_000,
    }
  );

  await spt.renounceRole(
    "0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a",
    "0x0a0dafddce3c5c9d314df6f1225cabf819dfbabc",
    {
      gasLimit: 1_000_000,
    }
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
