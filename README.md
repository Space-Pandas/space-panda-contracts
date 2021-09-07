# space-panda-contracts
Smart contract for Space Panda NFT, gaming, and Space Panda Token

## deploy with truffle
```bash
truffle migrate --network rinkeby
truffle run verify SpacePanda@0x24254f968375b0E8cB6FcBd69797f4673eE34eF4 --network rinkeby
```

## deploy with hardhat
```bash
npx hardhat compile
npx hardhat run --network rinkeby scripts/deploy.js
npx hardhat verify --network rinkeby 0x24254f968375b0E8cB6FcBd69797f4673eE34eF4 "SpacePanda" "SP"
```

## merge solidity
```bash
./node_modules/.bin/poa-solidity-flattener ./contracts/SpacePanda.sol
```

## run test
```bash
npx hardhat test
```