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

  it("buy, claim and withdraw", async function () {
    try {
      await this.scs.setStarted(true);

      await expect(
        this.scs.buySpt({
          value: BigNumber.from(0),
        })
      ).to.be.revertedWith("SCS: invalid amount");

      await network.provider.send("evm_setAutomine", [false]);

      await this.scs.buySpt({
        value: EthBase,
      }); // got 4000 SPT
      // mine two blocks
      await network.provider.send("evm_mine", []); // mine buy tx
      const blockNumber = await ethers.provider.getBlockNumber();
      await network.provider.send("evm_mine", []); // block + 1
      await network.provider.send("evm_mine", []); // block + 2

      const [owner, bob] = await ethers.getSigners();
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

      await network.provider.send("evm_setAutomine", [true]);

      await expect(this.scs.connect(bob).withdraw(EthBase)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      const scsBalance = await ethers.provider.getBalance(this.scs.address);
      expect(scsBalance).to.be.eq(EthBase);
      const ownerBalancePre = await ethers.provider.getBalance(owner.address);
      expect(this.scs.withdraw(EthBase))
        .to.emit(this.scs, "WithDraw")
        .withArgs(owner.address, EthBase);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(
        ownerBalanceAfter
          .sub(ownerBalancePre)
          .gt(EthBase.sub("100000000000000")) // with some gas fee
      );
      await expect(await ethers.provider.getBalance(this.scs.address)).to.be.eq(
        0
      );
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

      const balance = await ethers.provider.getBalance(this.scs.address);
      // balance should be 250 + 300 + 0.9996
      const slot3Balance = BigNumber.from(9996).mul(EthBase).div(10000);
      expect(balance).to.be.eq(
        BigNumber.from(250 + 300)
          .mul(EthBase)
          .add(slot3Balance)
      );
    } finally {
      await network.provider.send("evm_setAutomine", [true]);
    }
  });
  it("buy all at once", async function () {
    try {
      await this.scs.setStarted(true);
      await network.provider.send("evm_setAutomine", [false]);

      const [alice, bob, charlie] = await ethers.getSigners();
      const balanceBefore = await ethers.provider.getBalance(alice.address);

      const buy = await this.scs.buySpt({
        value: EthBase.mul(5000),
      });

      await network.provider.send("evm_mine", []);
      await expect(buy)
        .to.emit(this.scs, "SptBought")
        .withArgs(alice.address, sptAmount(1_000_000).mul(10));

      const [slot, , remains] = await this.scs.slotInfo();
      expect(slot).to.be.eq(10);
      expect(remains).to.be.eq(0);
      const balance = await ethers.provider.getBalance(this.scs.address);
      expect(balance).to.be.eq(EthBase.mul(4750));
      const balanceAfter = await ethers.provider.getBalance(alice.address);
      // balance change should be greater than scs received
      expect(balanceBefore.sub(balanceAfter)).to.be.gt(balance);
      // and less than received + 1 eth
      expect(balanceBefore.sub(balanceAfter)).to.be.lt(balance.add(EthBase));

      expect(
        this.scs.buySpt({
          value: EthBase,
        })
      ).to.be.revertedWith("SCS: out of slots");
    } finally {
      await network.provider.send("evm_setAutomine", [true]);
    }
  });
});
