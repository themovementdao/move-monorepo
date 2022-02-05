
export interface TwitterEntry {
    handle: string | undefined
    timestamp: number
};

export function useAllIdentities(): [any | undefined, (identities: any) => void] {
    const social = JSON.parse(localStorage.getItem('social') || "{}");
    const identities = social.identities || {};
    const setIdentities = (identities: any) => {
      localStorage.setItem('social', JSON.stringify({ ...social, identities }));
    };
    return [identities, setIdentities];
}

export function useAllVerifiedHandles(): { [address: string]: TwitterEntry | undefined } | undefined {
    const [allIdentities] = useAllIdentities();    
    if (allIdentities) {
      const twitterOnly: { [address: string]: TwitterEntry | undefined } | undefined = {};
      Object.keys(allIdentities).map((address) => {
        if (allIdentities[address].twitter !== undefined) {
          twitterOnly[address] = allIdentities[address].twitter;
        }
        return true;
      })
      return twitterOnly;
    } else {
      return undefined;
    }
  }