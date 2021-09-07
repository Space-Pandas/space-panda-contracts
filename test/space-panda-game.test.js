const { expect } = require("chai");
const { BigNumber } = require("ethers");

async function setupContracts() {
  const Panda = await ethers.getContractFactory("SpacePanda");
  const panda = await Panda.deploy("SpacePanda", "SP");
  await panda.deployed();

  const Spt = await ethers.getContractFactory("SpacePandaToken");
  const spt = await Spt.deploy();
  await spt.deployed();

  const Game = await ethers.getContractFactory("SpacePandaGame");
  const game = await Game.deploy(spt.address, panda.address);
  await game.deployed();
  const minterRole = await panda.MINTER_ROLE();
  await panda.grantRole(minterRole, game.address);
  return {
    panda,
    spt,
    game
  };
}

describe("space panda game tests", async function () {
  beforeEach(async function () {
    const { panda, spt, game } = await setupContracts();
    this.panda = panda;
    this.spt = spt;
    this.game = game;
  });

  it.skip("test panda update", async function () {
    const [, bob] = await ethers.getSigners();
    await this.panda.mintAirDropNft(bob.address);
    await this.panda.connect(bob).approve(this.game.address, 0);
    await this.game.connect(bob).updatePanda(0);
  });
});
