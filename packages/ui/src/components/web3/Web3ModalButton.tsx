/* eslint-disable react/jsx-pascal-case */
import {isMobile} from '@walletconnect/browser-utils';
import {useDispatch} from 'react-redux';

import {connectModalOpen} from '../../store/actions';
import {truncateEthAddress} from '../../util/helpers';
import {useIsDefaultChain} from './hooks';
import {useWeb3Modal} from './hooks';
import {WalletIcon} from './';
import { useVerifiedHandle } from '../twiiter/hooks/useVerifiedHandle';
import { useTwitterProfileData } from '../twiiter/hooks/useTwitterProfileData';
import LogoText from '../twiiter/LogoText';
import { TYPE } from '../../theme';
import styled from 'styled-components';
import EmptyProfile from '../../assets/images/emptyprofile.png';

type CustomWalletTextProps = {
  account: ReturnType<typeof useWeb3Modal>['account'];
  connected: ReturnType<typeof useWeb3Modal>['connected'];
  isMobile: ReturnType<typeof isMobile>;
};

type ConnectWalletButtonProps = {
  customWalletText?: ((o: CustomWalletTextProps) => string) | string;
  showWalletETHBadge?: boolean;
};

const RoundedProfileImage = styled.div`
  height: 44px;
  width: 44px;
  background: ${({ theme }) => theme.bg4};
  border-radius: 50%;
  margin-right: 10px;

  & > img {
    height: 100%;
    width: 100%;
    border-radius: 50%;
  }
`;

const TwitterAccountShow = styled.div`
  display: flex;
`;

const AvatarColumn = styled.div``;

const InforationColumn = styled.div`
  text-align: left;
`;

const WalletInfo = styled.div`
  display: flex;
  align-items: center;
`;

export default function ConnectWalletButton({
  customWalletText,
  // Defaults to `true`
  showWalletETHBadge = true,
}: ConnectWalletButtonProps): JSX.Element {
  /**
   * Our hooks
   */

  const {account, connected, web3Modal} = useWeb3Modal();

  const {isDefaultChain} = useIsDefaultChain();

  /**
   * Their hooks
   */

  const dispatch = useDispatch();

  /**
   * Variables
   */

  const isWrongNetwork: boolean = isDefaultChain === false;

  /**
   * Functions
   */

  function getWalletText(): string {
    if (customWalletText) {
      return typeof customWalletText === 'function'
        ? customWalletText({account, connected, isMobile: isMobile()})
        : customWalletText;
    }

    if (account) {
      return truncateEthAddress(account);
    }

    return 'Connect';
  }

  const verifiedHandleEntry = useVerifiedHandle(account);
  const profileData = useTwitterProfileData(verifiedHandleEntry?.handle);

  /**
   * Return
   */

  return (
    <button
      className={`walletconnect__connect-button 
        ${
          isWrongNetwork && connected
            ? 'walletconnect__connect-button--error'
            : ''
        }`}
      onClick={() => {
        dispatch(connectModalOpen());
      }}>
      <span
        className={`connect-button-text ${
          connected ? 'connect-button-text--ethAddress' : ''
        }`}>
          
        {
          verifiedHandleEntry?.handle ? (
            <TwitterAccountShow>
              <AvatarColumn>
                <RoundedProfileImage>
                  <img src={!profileData?.profileURL ? EmptyProfile : profileData?.profileURL} alt="" />
                </RoundedProfileImage>
              </AvatarColumn>
              <InforationColumn>
                <LogoText type="twitter">@{verifiedHandleEntry.handle}</LogoText>
                <WalletInfo>
                <TYPE.main fontSize="12px">{getWalletText()}</TYPE.main> {showWalletETHBadge && (
                     <WalletIcon providerName={web3Modal?.cachedProvider} />
                )}
                </WalletInfo>
              </InforationColumn>
            </TwitterAccountShow>
          ) : getWalletText()      
        }
      </span>

      {isWrongNetwork && connected && <span>Wrong Network</span>}

      
    </button>
  );
}
