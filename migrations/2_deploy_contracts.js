const SpacePanda = artifacts.require("SpacePanda");
const SpacePandaToken = artifacts.require("SpacePandaToken");

module.exports = function(deployer) {
    deployer.deploy(SpacePandaToken);
    deployer.deploy(SpacePanda, "SpacePanda", "SP");
};
