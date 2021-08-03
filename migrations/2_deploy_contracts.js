const SpacePandaToken = artifacts.require("SpacePandaToken");

module.exports = function(deployer) {
    deployer.deploy(SpacePandaToken);
};
