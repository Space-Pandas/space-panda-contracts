const SpacePanda = artifacts.require("SpacePanda");

contract("space panda test", async accounts => {
    it("should deploy successfully", async () => {
        const panda = await SpacePanda.deployed();
        const name = await panda.name();
        const symbol = await panda.symbol();
        assert.equal(name, "SpacePanda");
        assert.equal(symbol, "SP");
    });
});
