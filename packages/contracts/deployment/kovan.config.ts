import { contracts } from './contracts.config';

const disabled = [
  // Utility & Test Contracts disabled by default
  "OLToken",
  "TestToken1",
  "TestToken2",
  "TestFairShareCalc",
  "PixelNFT",
  "ProxToken",
  "ERC20Minter",
  // Adapters disabled for Muse0 DAO Deployment
  "RagequitContract",
  "FinancingContract",
  "OnboardingContract",
  "TributeContract",
  "DistributeContract",
];

export const kovanContracts = contracts.map((c) => {
  if (disabled.find((e) => e === c.name)) {
    return { ...c, enabled: false };
  }
  return c;
});