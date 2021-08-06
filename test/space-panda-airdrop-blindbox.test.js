const { expect } = require("chai");
const { BigNumber } = require("ethers");

async function setupContracts() {
  const Panda = await ethers.getContractFactory("SpacePanda");
  const panda = await Panda.deploy("SpacePanda", "SP");
  await panda.deployed();
  return panda;
}

async function getCurrentPrice(that) {
  const price = await that.panda.getCommonNftPrice();
  return ethers.utils.formatEther(price);
}

async function printBalance() {
  const [owner] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(owner.address);
  console.log(`${owner.address} has ${ethers.utils.formatEther(balance)} ether`);
}

describe("space panda airdrop tests", async function () {
  beforeEach(async function () {
    const panda = await setupContracts();
    this.panda = panda;
  });

  it("test airdrop", async function () {
    let price = await getCurrentPrice(this);
    expect(price).to.eq("0.08");
    await printBalance();
    const toAddress = "0xcdbf90174493dcc418f177a4d7b2604a95997e1f";
    for(let i=1; i<501; i++) {
      await this.panda.mintAirDropNft(toAddress);
      if (i % 50 === 0) {
        console.log(`mint airdrop blindbox for ${i} times`);
      }
    }
    expect(
        this.panda.mintAirDropNft(toAddress)
    ).to.be.revertedWith("Airdrop ended");

    const total = await this.panda.totalSupply();
    expect(total).to.be.equal(500);

    await this.panda.setBaseURI("https://www.pandas.land/");
    const uri = await this.panda.tokenURI(0);
    expect(uri).to.be.equal("https://www.pandas.land/0");
  });
});
