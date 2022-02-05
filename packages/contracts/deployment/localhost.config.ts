import { contracts as localhostContracts } from './contracts.config';

const disabled = [];

export const contracts: any = localhostContracts.map((c) => {
  if (disabled.find((e) => e === c.name)) {
    return { ...c, enabled: false };
  }
  return c;
});
