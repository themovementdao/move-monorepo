import { useCallback } from "react"
import { useWeb3Modal } from "../../web3/hooks/useWeb3Modal";

const VERIFICATION_WORKER_URL = process.env.REACT_APP_VERIFICATION_WORKER_URL;

export interface VerifyResult {
    readonly success: boolean
    readonly error?: string | undefined
};

export function useVerifyCallback(tweetID: string | undefined): { verifyCallback: () => Promise<VerifyResult> } {
    const { account } = useWeb3Modal();
  
    const verifyCallback = useCallback(() => {
      if (!tweetID)
        return Promise.reject({
          success: false,
          error: 'Invalid tweet id',
        })
  
      return fetch(`${VERIFICATION_WORKER_URL}/api/verify?account=${account}&id=${tweetID}`)
        .then(async (res) => {
          if (res.status === 200) {
            return {
              success: true,
            }
          } else {
            const errorText = await res.text()
            if (res.status === 400 && errorText === 'Invalid tweet format.') {
              return {
                success: false,
                error: 'Invalid tweet format',
              }
            }
            if (res.status === 400 && errorText === 'Invalid tweet id.') {
              return {
                success: false,
                error: 'Invalid tweet id',
              }
            }
            return {
              success: false,
              error: 'Unknown error, please try again.',
            }
          }
        })
        .catch(() => {
          return {
            success: false,
            error: 'Error submitting verification',
          }
        })
    }, [account, tweetID])
  
    return { verifyCallback }
  }