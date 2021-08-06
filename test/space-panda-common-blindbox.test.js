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

describe("space panda overall tests", async function () {
  beforeEach(async function () {
    const panda = await setupContracts();
    this.panda = panda;
  });

  it("should fail if common nft not start", async function () {
    expect(
        this.panda.mintCommonNft(1, {
          value: 1
        })
    ).to.be.revertedWith("Not started");
  });

  it("test common price", async function () {
    await this.panda.startBlindBox(false);
    // [1 - 30000] should be 0.08
    let price = await getCurrentPrice(this);
    expect(price).to.eq("0.08");
    await printBalance();
    for(let i=1; i<601; i++) {
      await this.panda.mintCommonNft(50, {
        value: ethers.utils.parseEther("4")
      });
      if (i % 50 === 0) {
        console.log(`open blindbox for ${i * 50} times with 0.08`);
      }
    }
    await printBalance();

    // [30001 - 42000] should be 0.12
    price = await getCurrentPrice(this);
    expect(price).to.eq("0.12");
    for(let i=1; i<241; i++) {
      await this.panda.mintCommonNft(50, {
        value: ethers.utils.parseEther("6")
      });
      if (i % 50 === 0) {
        console.log(`open blindbox for ${i * 50} times with 0.12`);
      }
    }
    await printBalance();

    // [42001 - 45000] should be 0.25
    price = await getCurrentPrice(this);
    expect(price).to.eq("0.25");
    for(let i=1; i<61; i++) {
      await this.panda.mintCommonNft(50, {
        value: ethers.utils.parseEther("12.5")
      });
      if (i % 50 === 0) {
        console.log(`open blindbox for ${i * 50} times with 0.25`);
      }
    }
    await printBalance();

    // [45001 - 45800] should be 0.6
    price = await getCurrentPrice(this);
    expect(price).to.eq("0.6");
    for(let i=1; i<17; i++) {
      await this.panda.mintCommonNft(50, {
        value: ethers.utils.parseEther("30")
      });
      if (i % 4 === 0) {
        console.log(`open blindbox for ${i * 50} times with 0.6`);
      }
    }
    await printBalance();

    // [45801 - 46050] should be 1.8
    price = await getCurrentPrice(this);
    expect(price).to.eq("1.8");
    for(let i=1; i<6; i++) {
      await this.panda.mintCommonNft(50, {
        value: ethers.utils.parseEther("90")
      });
      if (i % 2 === 0) {
        console.log(`open blindbox for ${i * 50} times with 1.8`);
      }
    }
    await printBalance();

    // [46051 - 46110] should be 8
    price = await getCurrentPrice(this);
    expect(price).to.eq("8.0");
    for(let i=1; i<7; i++) {
      await this.panda.mintCommonNft(10, {
        value: ethers.utils.parseEther("80")
      });
      if (i % 2 === 0) {
        console.log(`open blindbox for ${i * 10} times with 8`);
      }
    }
    await printBalance();

    // [46111 - 46120] should be 50
    price = await getCurrentPrice(this);
    expect(price).to.eq("50.0");
    for(let i=1; i<2; i++) {
      await this.panda.mintCommonNft(10, {
        value: ethers.utils.parseEther("500")
      });
      console.log(`open blindbox for ${i} times with 50`);
    }
    await printBalance();
  });
});
