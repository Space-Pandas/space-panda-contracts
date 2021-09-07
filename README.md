# space-panda-contracts
Smart contract for Space Panda NFT, gaming, and Space Panda Token

## deploy with truffle
```bash
truffle migrate --network rinkeby
truffle run verify SpacePanda@0x436854Fb3Fa4BB15CE65CF0E44fF2aBd2D54a971 --network rinkeby
```

### deploy with hardhat
```bash
npx hardhat compile
npx hardhat run --network rinkeby scripts/deploy.js
npx hardhat verify --network rinkeby 0x77e92092f875C7E50309Cf741bA8ce6b2f27636D "SpacePanda" "SP"
```
