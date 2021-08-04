const { expect } = require("chai");
const { BigNumber } = require("ethers");

const SptBase = BigNumber.from(1_000_000);
const EthBase = BigNumber.from(10).pow(18);

const LockBlocks = (365 * 24 * 60 * 60) / 10;
async function setupContracts() {
  const Spt = await ethers.getContractFactory("SpacePandaToken");
  const spt = await Spt.deploy();
  await spt.deployed();
  const Scs = await ethers.getContractFactory("SptCrowdSale");
  // block time: 10s, total lock blocks: 3153600
  const scs = await Scs.deploy(spt.address, 10);
  await scs.deployed();
  await spt.mint(scs.address, BigNumber.from(100_000_000).mul(SptBase));
  return {
    spt,
    scs,
  };
}

describe("crowd sale test", async function () {
  beforeEach(async function () {
    const { spt, scs } = await setupContracts();
    this.spt = spt;
    this.scs = scs;
  });

  it("contracts setup correctly", async function () {
    const balance = await this.spt.balanceOf(this.scs.address);
    expect(balance).to.eq(BigNumber.from("100000000000000"));
  });

  it("fail if not started", async function () {
    expect(
      this.scs.buySpt({
        value: 1,
      })
    ).to.be.revertedWith("SCS: not started");

    const [owner] = await ethers.getSigners();

    expect(
      owner.sendTransaction({
        to: this.scs.address,
        value: 10_000,
      })
    ).to.be.revertedWith("SCS: not started");
  });

  it("success if started", async function () {
    await this.scs.setStarted(true);
    expect(
      this.scs.buySpt({
        value: EthBase,
      })
    ).to.be.ok;

    const [owner] = await ethers.getSigners();

    expect(
      owner.sendTransaction({
        to: this.scs.address,
        value: EthBase,
      })
    ).to.be.ok;
  });

  it("buy once", async function () {
    try {
      await this.scs.setStarted(true);
      await network.provider.send("evm_setAutomine", [false]);
      await this.scs.buySpt({
        value: EthBase,
      }); // got 4000 SPT
      // mine two blocks
      await network.provider.send("evm_mine", []); // mine buy tx
      const blockNumber = await ethers.provider.getBlockNumber();
      await network.provider.send("evm_mine", []); // block + 1
      await network.provider.send("evm_mine", []); // block + 2

      const [owner] = await ethers.getSigners();
      const [claimable, record] = await this.scs.claimInfo(owner.address, 0);
      const claimableAmount = BigNumber.from(4000 * 1_000_000)
        .mul(2)
        .div(LockBlocks);

      expect(claimable.toString()).to.be.equal(claimableAmount.toString());
      expect(record.startBlock.toString()).to.be.eq(`${blockNumber}`);
      expect(record.endBlock.toString()).to.be.eq(
        `${blockNumber + LockBlocks}`
      );
      await this.scs.claimSpt();
      await network.provider.send("evm_mine", []); // block + 3
      const balance = await this.spt.balanceOf(owner.address);
      const claimed = BigNumber.from(4000 * 1_000_000)
        .mul(3)
        .div(LockBlocks);
      expect(balance.toString()).to.be.eq(claimed.toString());

      const [claimable2, record2] = await this.scs.claimInfo(owner.address, 0);
      expect(claimable2.toString()).to.be.equal("0");
      expect(record2.startBlock).to.be.equal(`${blockNumber + 4}`);
      expect(record2.endBlock).to.be.eq(record.endBlock);
    } finally {
      await network.provider.send("evm_setAutomine", [true]);
    }
  });
});
