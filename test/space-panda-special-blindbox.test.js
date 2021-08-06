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

describe("space panda special tests", async function () {
  beforeEach(async function () {
    const panda = await setupContracts();
    this.panda = panda;
  });

  it("should fail if special nft not start", async function () {
    expect(
        this.panda.mintSpecialNft(1, {
          value: 1
        })
    ).to.be.revertedWith("Not started");
  });

  it("test special price", async function () {
    await this.panda.startBlindBox(true);
    await printBalance();
    for(let i=1; i<25; i++) {
      await this.panda.mintSpecialNft(10, {
        value: ethers.utils.parseEther("500")
      });
      if (i % 4 === 0) {
        console.log(`open special blindbox for ${i * 10} times with 50`);
      }
    }
    expect(
      this.panda.mintSpecialNft(1, {
        value: ethers.utils.parseEther("50")
      })
    ).to.be.revertedWith("Exceeds max supply");
    await printBalance();

    const [, bob] = await ethers.getSigners();
    for(let i=1; i<127; i++) {
      await this.panda.mintAuctionNft(bob.address);
      if (i % 10 === 0) {
        console.log(`open auction blindbox for ${i} times`);
      }
    }

    //next round
    await this.panda.startNextSpecialNft();
    for(let i=1; i<25; i++) {
      await this.panda.mintSpecialNft(10, {
        value: ethers.utils.parseEther("500")
      });
      if (i % 4 === 0) {
        console.log(`open special blindbox for ${i * 10} times with 50`);
      }
    }
    await printBalance();
  });
});
