import { useEffect } from "react"
import { fetchLatestTweet, LatestTweetResponse } from "../service/social"

const POLL_DURATION_MS = 8000 // length after which to check
export function useTweetWatcher(
  sig: string | undefined, // used to check regex
  twitterHandle: string | undefined, // handle to fetch tweet from
  watch: boolean, // wether to actively look or not
  setWatch: any,
  setTweetID: any,
  setTweetError: any
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (twitterHandle && watch) {
        fetchLatestTweet(twitterHandle)
          .then((res: LatestTweetResponse | null) => {
            if (res?.data[0]) {
              const tweetData = res?.data?.[0]
              // check that tweet contains correct data
              const passedRegex = sig && tweetData.text.includes('sig:' + sig)
              if (passedRegex) {
                setTweetID(tweetData.id)
                setTweetError(undefined)
                setWatch(false)
              } else {
                setWatch(false)
                setTweetError('Tweet not found, try again with exact message.')
              }
            } else {
              setWatch(false)
              setTweetError('Tweet not found, try again.')
            }
          })
          .catch(() => {
            setWatch(false)
            setTweetError('Tweet not found, try again.')
          })
      }
    }, POLL_DURATION_MS)
    return () => clearTimeout(timer)
  }, [setTweetError, setTweetID, setWatch, sig, twitterHandle, watch])
}