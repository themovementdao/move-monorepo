import { useEffect, useState } from "react"
import { fetchProfileData, ProfileDataResponse } from "../service/social"

interface TwitterProfileData {
    name: string
    handle: string
    profileURL: string
  }

export function useTwitterProfileData(handle: string | undefined | null): TwitterProfileData | undefined {
    const [formattedData, setFormattedData] = useState<TwitterProfileData | undefined>()
    const [error, setError] = useState(false)
  
    useEffect(() => {
      if (!handle) {
        setFormattedData(undefined)
      } else if (!error) {          
        fetchProfileData(handle)
          .then((profileData: ProfileDataResponse | null) => {              
            if (profileData?.data) {
              setFormattedData({
                name: profileData.data.name,
                handle: profileData.data.username,
                profileURL: profileData.data.profile_image_url,
              })
            }
          })
          .catch(() => {
            console.log('Error fetching profile data for user')
            setError(true)
          })
      }
    }, [handle, error])
  
    return formattedData
  }