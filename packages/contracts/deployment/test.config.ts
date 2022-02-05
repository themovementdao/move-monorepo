import { contracts as testContracts } from './contracts.config';

const disabled = [];

export const contracts: any = testContracts.map((c) => {
  if (disabled.find((e) => e === c.name)) {
    return { ...c, enabled: false };
  }
  return c;
});
