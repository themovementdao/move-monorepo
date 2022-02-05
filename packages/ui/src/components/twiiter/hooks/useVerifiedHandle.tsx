import { TwitterEntry, useAllVerifiedHandles } from "./useAllVerifiedHandles";
import { getAddress } from '@ethersproject/address';

export function isAddress(value: any): string | false {
    try {
      return getAddress(value);
    } catch {
      return false;
    }
  }

export function useVerifiedHandle(address: string | null | undefined): TwitterEntry | undefined | null {
    const allHandles = useAllVerifiedHandles();
    const formattedAddress = address && isAddress(address);
    if (!allHandles) {
      return null;
    }
    if (!formattedAddress) {
      return undefined;
    }
    return allHandles[formattedAddress];
  }
  