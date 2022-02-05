export const TWITTER_WORKER_URL = process.env.REACT_APP_TWITTER_WORKER_URL

export interface ProfileDataResponse {
    data: {
      id: number
      name: string
      username: string
      profile_image_url: string
    }
  }
const PROFILE_DATA_PROMISES: { [key: string]: Promise<ProfileDataResponse | null> } = {}

export function fetchProfileData(handle: string): Promise<ProfileDataResponse | null> {
    const key = `${handle}`
    const url = `${TWITTER_WORKER_URL}/user?handle=${handle}`

    try {
      return (PROFILE_DATA_PROMISES[key] =
        PROFILE_DATA_PROMISES[key] ??
        fetch(url)
          .then(async (res) => {
            if (res.status === 200) {
              return await res.json()
            } else {
              Promise.reject('No handle found')
              return null
            }
          })
          .catch((error) => {
            return Promise.reject(error)
          }))
    } catch {
      return Promise.reject('Error: fetching profile data')
    }
}

export interface LatestTweetResponse {
  data: [
    {
      id: string
      text: string
    }
  ]
}

export async function fetchLatestTweet(handle: string): Promise<LatestTweetResponse | null> {
  const url = `${TWITTER_WORKER_URL}/latest-tweet?handle=` + handle
  try {
    return fetch(url).then(async (res) => {
      if (res.status === 200) {
        return res.json()
      } else {
        return Promise.reject('Error fetching latest tweet')
      }
    })
  } catch (error) {
    return Promise.reject('Error fetching latest tweet')
  }
}
