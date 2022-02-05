import { useState, useCallback, Dispatch, SetStateAction } from 'react'
import { useWeb3Modal } from '../../web3/hooks/useWeb3Modal';


export function useSignedHandle(twitterHandle: string | undefined): {
  sig: string | undefined
  signMessage: () => void
  setSig: Dispatch<SetStateAction<string | undefined>>
  error: string | undefined
} {
  const {
    account,
    provider
  } = useWeb3Modal();

  // store and set signature
  const [sig, setSig] = useState<string | undefined>()

  // mark errors
  const [error, setError] = useState<string | undefined | any>()

  const signMessage = useCallback(() => {
    // reset error
    setError(undefined)

    if (!provider && account) {
      return
    }
    const EIP712Domain = [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
    ]
    const domain = {
      name: 'Sybil Verifier',
      version: '1',
    }
    const Permit = [{ name: 'username', type: 'string' }]
    const message = { username: twitterHandle }
    const data = JSON.stringify({
      types: {
        EIP712Domain,
        Permit,
      },
      domain,
      primaryType: 'Permit',
      message,
    })

    /**
     * Need to use personal_sign as eth typed data is not
     * supported by most hardware wallets yet.
     */
    if (account) {
      //format as hex
      const message = new Buffer(data).toString('hex')

      // need to manually prefix with 0x for wallet connect
      provider
        ?.send('personal_sign', ['0x' + message, account])
        .catch((error: any) => {
          console.log(error);
          setError('Error signing message');
        })
        .then((sig: { result: string }) => {
          setSig(sig.result);
        })
    }
  }, [account, provider, twitterHandle])

  return { sig, signMessage, setSig, error }
}
