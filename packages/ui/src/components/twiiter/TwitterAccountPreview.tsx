/* eslint-disable react/jsx-pascal-case */
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'
import { AutoColumn } from '../common/Column'
import { RowBetween, RowFixed } from '../common/Row'
import { useTwitterAccount } from './hooks/useTwitterAccount'
import { useTwitterProfileData } from './hooks/useTwitterProfileData'
import { TYPE, CloseIcon } from '../../theme'

const Wrapper = styled.div`
  padding: 1rem;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.05);
  margin-top: 1rem;
  margin-bottom: 1rem;
`

const RoundedProfileImage = styled.div`
  display: flex;
  justify-content: center;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  margin-right: 1rem;

  & > img {
    height: 100%;
    width: 100%;
    border-radius: 50%;
  }
`

const PendingFlag = styled.div<{ verified: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme, verified }) => (verified ? theme.green1 : theme.yellow2)};
  color: ${({ theme, verified }) => (verified ? theme.green1 : theme.yellow2)};
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
`

const StyledClose = styled(CloseIcon)`
  margin-left: 1rem;
  height: 16px;
  width: 16px;
`

function TwitterAccountPreview() {
  const [twitterAccount] = useTwitterAccount()  
  // get profile data based on handle being used
  const profileData = useTwitterProfileData(twitterAccount)  

  return profileData ? (
    <Wrapper>
      <RowBetween>
        <RowFixed>
          <RoundedProfileImage>
            <img src={profileData.profileURL} alt="profile" />
          </RoundedProfileImage>
          <AutoColumn>
            <RowFixed>
              <TYPE.body mr="12px" fontSize="18px" fontWeight="500">
                @{profileData.handle}
              </TYPE.body>
              <PendingFlag verified={false}>Unverified</PendingFlag>
            </RowFixed>
          </AutoColumn>
        </RowFixed>
        <StyledClose onClick={() => null} />
      </RowBetween>
    </Wrapper>
  ) : twitterAccount ? (
    <Wrapper>
      <RowBetween>
        <RowFixed>
          <AutoColumn>
            <RowFixed>
              <TYPE.body mr="12px" fontSize="18px" fontWeight="500">
                @{twitterAccount}
              </TYPE.body>
              <PendingFlag verified={false}>Unverified</PendingFlag>
            </RowFixed>
          </AutoColumn>
        </RowFixed>
        <StyledClose onClick={() => null} />
      </RowBetween>
    </Wrapper>
  ) : null
}

export default withRouter(TwitterAccountPreview)
