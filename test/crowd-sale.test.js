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
  await spt.mint(scs.address, sptAmount(100_000_000));
  return {
    spt,
    scs,
  };
}

function sptAmount(count) {
  return SptBase.mul(count);
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

  it("buy and claim", async function () {
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
        .mul(1)
        .div(LockBlocks);

      expect(claimable.toString()).to.be.equal(claimableAmount.toString());
      expect(record.startBlock.toString()).to.be.eq(`${blockNumber + 1}`);
      expect(record.endBlock.toString()).to.be.eq(
        `${blockNumber + 1 + LockBlocks}`
      );
      await this.scs.claimSpt();
      await network.provider.send("evm_mine", []); // block + 3
      const balance = await this.spt.balanceOf(owner.address);
      const claimed = BigNumber.from(4000 * 1_000_000)
        .mul(2)
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

  it("buy twice should claim", async function () {
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
      await this.scs.buySpt({
        value: EthBase,
      }); // got 4000 SPT
      await network.provider.send("evm_mine", []); // block + 3

      const [owner] = await ethers.getSigners();
      const [claimable, record] = await this.scs.claimInfo(owner.address, 0);
      const balance = await this.spt.balanceOf(owner.address);
      const claimed = sptAmount(4000).mul(2).div(LockBlocks);
      expect(balance.toString()).to.be.eq(claimed.toString());

      const pendingAmount = sptAmount(4000).mul(2).sub(claimed);
      expect(record.amount).to.be.equal(pendingAmount);

      expect(claimable.toString()).to.be.equal("0");
      expect(record.startBlock.toString()).to.be.eq(`${blockNumber + 4}`);
      const newEndBlock = blockNumber + 4 + LockBlocks; // + 3 + 1
      expect(record.endBlock.toString()).to.be.eq(`${newEndBlock}`);
    } finally {
      await network.provider.send("evm_setAutomine", [true]);
    }
  });
  it("buy cross price margins", async function () {
    try {
      await this.scs.setStarted(true);
      await network.provider.send("evm_setAutomine", [false]);

      await this.scs.buySpt({
        value: EthBase,
      }); // got 4000 SPT
      await network.provider.send("evm_mine", []);

      const [, bob, charlie] = await ethers.getSigners();

      await this.scs.connect(bob).buySpt({
        value: EthBase.mul(250),
      }); // should got slot0: 996000 + 3333 at slot 1
      await network.provider.send("evm_mine", []);

      const [slot, price, remains] = await this.scs.slotInfo();
      expect(slot).to.be.eq(1);
      expect(price).to.be.eq(EthBase.mul(3).div(10000));
      expect(remains).to.be.equal(1_000_000 - 3333);

      const [claimable, record] = await this.scs.claimInfo(bob.address, 0);
      expect(record.amount).to.be.equal(sptAmount(996000 + 3333));
      expect(claimable).to.be.equal("0");

      await this.scs.connect(charlie).buySpt({
        value: EthBase.mul(300),
      }); // should got slot1: 996667 + 2856 at slot2
      await network.provider.send("evm_mine", []);

      const [slot2, price2, remains2] = await this.scs.slotInfo();
      expect(slot2).to.be.eq(2);
      expect(price2).to.be.eq(EthBase.mul(35).div(100000));
      expect(remains2).to.be.equal(1_000_000 - 2856);

      const [claimable2, record2] = await this.scs.claimInfo(
        charlie.address,
        0
      );
      expect(record2.amount).to.be.equal(sptAmount(996667 + 2856));
      expect(claimable2).to.be.equal("0");
    } finally {
      await network.provider.send("evm_setAutomine", [true]);
    }
  });
});
