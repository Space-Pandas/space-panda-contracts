const SpacePanda = artifacts.require("SpacePanda");

contract("space panda test", async accounts => {
    it("should deploy successfully", async () => {
        const panda = await SpacePanda.deployed();
        const name = await panda.name();
        const symbol = await panda.symbol();
        assert.equal(name, "SpacePanda");
        assert.equal(symbol, "SP");
    });

    it("should deploy successfully", async () => {
        const panda = await SpacePanda.deployed();
    });

    /**it("should mint successfully", async () => {
        const panda = await SpacePanda.deployed();
        for(let i=0; i<200; i++) {
            await panda.airDropNFT(accounts[1])
        }
        await panda.airDropNFT(accounts[1])
        const balance = await panda.balanceOf(accounts[1]);
        console.log(accounts[1], balance.toString())
    });**/
});
