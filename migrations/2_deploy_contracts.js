const SpacePanda = artifacts.require("SpacePanda");

module.exports = function(deployer) {
    deployer.deploy(SpacePanda, "SpacePanda", "SP", "0x0000000000000000000000000000000000000000");
};
