const { assert, expect } = require("chai");

describe("space panda test", async () => {
  it("should deploy successfully", async () => {
    const Panda = await ethers.getContractFactory("SpacePanda");
    const panda = await Panda.deploy("SpacePanda", "SP");
    await panda.deployed();
    const name = await panda.name();
    const symbol = await panda.symbol();
    assert.equal(name, "SpacePanda");
    assert.equal(symbol, "SP");
  });
});
