/* eslint-disable react/jsx-pascal-case */
import {NavLink} from 'react-router-dom';
import {Transition} from 'react-transition-group';
import {useSelector} from 'react-redux';
import {useState, useEffect, useRef} from 'react';
import Media from 'react-media';
import ReactModal from 'react-modal';
import styled from 'styled-components'

import {ModalLogo} from './logo';
import {StoreState} from '../store/types';
import {useWeb3Modal} from './web3/hooks';
import HamburgerSVG from '../assets/svg/HamburgerSVG';
import TimesSVG from '../assets/svg/TimesSVG';
import Web3ModalButton from './web3/Web3ModalButton';
import DaoTokenHolder from './dao-token/DaoTokenHolder';
import TwitterLoginButton from './twiiter/TwitterLoginButton';
import { useTwitterAccount } from './twiiter/hooks/useTwitterAccount';
import useParsedQueryString from '../hooks/useParsedQueryString';
import Modal from './common/Modal';
import TwitterAccountPreview from './twiiter/TwitterAccountPreview';
import { ButtonBasic, ButtonPrimary } from './common/Button';
import { TYPE } from '../theme';
import { RowBetween } from './common/Row'
import TwitterIcon from '../assets/images/Twitter_Logo_Blue.png'
import { useSignedHandle } from './twiiter/hooks/useSignedHandle';
import { useTweetWatcher } from './twiiter/hooks/useTweetWatcher';
import { fetchLatestTweet, LatestTweetResponse } from './twiiter/service/social';
import { useVerifyCallback } from './twiiter/hooks/useVerifyCallback';
import { Tweet } from 'react-twitter-widgets';
import { useAllIdentities, useAllVerifiedHandles } from './twiiter/hooks/useAllVerifiedHandles';
import { useVerifiedHandle } from './twiiter/hooks/useVerifiedHandle';

// see: http://reactcommunity.org/react-transition-group/transition
const duration = 200;

const defaultStyle = {
  transition: '0.1s',
};

const transitionOpeningStyles: Record<string, any> = {
  entering: {right: '-300px'},
  entered: {right: 0},
  exiting: {right: 0, opacity: 0},
  exited: {right: '-300px', opacity: 0},
};

const transitionClosingStyles: Record<string, any> = {
  entering: {right: 0, opacity: 1},
  entered: {right: '-300px', opacity: 1},
  exiting: {right: '-300px', opacity: 1},
  exited: {right: 0, opacity: 1},
};

const TwitterButton = styled(ButtonBasic)`
  padding: 6px 12px;
  white-space: nowrap;
  width: 100%;
`;


const TwitterLogo = styled.img`
  height: 24px;
  width: 24px;
`;

const TweetWrapper = styled.div`
  padding: 1rem;
  color: ${({ theme }) => theme.blue1};
  background: #f2f2f2;
  word-break: break-word;
  margin-bottom: 1rem;
`;

export function NavLinks() {
  return (
    <nav role="navigation" id="navigation">
      <ul className="nav__list" data-testid="nav__list">
        <li tabIndex={0}>
          <NavLink to="/membership">
            <span>Membership</span>
          </NavLink>
        </li>
        <li tabIndex={0}>
          <NavLink to="/governance">
            <span>Governance</span>
          </NavLink>
        </li>
        <li tabIndex={0}>
          <NavLink to="/transfers">
            <span>Transfer</span>
          </NavLink>
        </li>
        <li tabIndex={0}>
          <NavLink to="/tributes">
            <span>Tribute</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export function NavHamburger() {
  /**
   * Selectors
   */

  const connectedMember = useSelector((s: StoreState) => s.connectedMember);

  /**
   * State
   */

  const [shouldShowMenuModal, setShouldShowMenuModal] = useState(false);
  const [transitionStyles, setTransitionStyles] = useState<Record<string, any>>(
    transitionOpeningStyles
  );

  /**
   * Our hooks
   */

  const {account} = useWeb3Modal();

  /**
   * Refs
   */

  const closeMenuRef = useRef<NodeJS.Timeout>();

  /**
   * Effects
   */

  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      closeMenuRef.current && clearTimeout(closeMenuRef.current);
    };
  }, []);

 
  /**
   * Variables
   */

  const isCurrentMemberOrDelegateConnected: boolean =
    account && connectedMember?.isActiveMember ? true : false;
  const isCurrentMemberConnected: boolean =
    account &&
    connectedMember?.isActiveMember &&
    account.toLowerCase() === connectedMember?.memberAddress.toLowerCase()
      ? true
      : false;

  /**
   * Functions
   */

  function handleMenuModalClose(close: boolean) {
    // delay transition for closing
    if (close) {
      setShouldShowMenuModal(close);
      setTransitionStyles(transitionOpeningStyles);
    } else {
      setTransitionStyles(transitionClosingStyles);
      closeMenuRef.current = setTimeout(
        () => setShouldShowMenuModal(close),
        500
      );
      return () => closeMenuRef.current && clearTimeout(closeMenuRef.current);
    }
  }

  // Twitter account logic
  const { username: usernameQuery } = useParsedQueryString();
  const [twitterAccount] = useTwitterAccount();
  const [showTwitterFlow, setShowTwitterFlow] = useState<boolean>(false);
  const [tweetID, setTweetID] = useState<undefined | string>();
  const [watch, setWatch] = useState<boolean>(false);
  const [tweetError, setTweetError] = useState<string | undefined>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sig, signMessage, setSig, error: sigError } = useSignedHandle(twitterAccount)
  const activeProtocol = { social: 'Twitter', emoji: "", id: "", token: { symbol: "TED" } };

  const { verifyCallback } = useVerifyCallback(tweetID);
  const [attempting, setAttempting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [requestError, setRequestError] = useState<string | undefined>();
  
  const verifiedHandles = useAllVerifiedHandles();
  const [allIndentities, setAllIdentities] = useAllIdentities();

  const verifiedHandleEntry = useVerifiedHandle(account);

  const tweetCopyForLink = `${activeProtocol?.emoji ?? ''}Verifying myself as a ${activeProtocol?.social} %23${
    activeProtocol?.token?.symbol
  }Delegate on Ted Dao🏛️%0A%0Ated-dao.xyz%0A%0Aaddr:${account}%0A%0Asig:${sig ?? ''}`;

  const readableTweetCopy = `${activeProtocol?.emoji ?? ''}Verifying myself as a ${activeProtocol?.social} #${
    activeProtocol?.token?.symbol
  }Delegate on Ted Dao🏛\n sted-dao.xyz \n addr:${account} \n sig:${sig ?? ''}`;

  useEffect(() => {
    const social = JSON.parse(localStorage.getItem("social") || "{}");
    if (usernameQuery && !social.identities) {
      localStorage.setItem('social', JSON.stringify({ twitterAccount: usernameQuery as string }));
      setShowTwitterFlow(true);
    }
  }, [usernameQuery]);
 
  useTweetWatcher(sig, twitterAccount, watch, setWatch, setTweetID, setTweetError);

  function startWatching() {
    setWatch(true) // restart watcher
    setTweetError(undefined) // reset error
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetCopyForLink}`,
      'tweetWindow',
      'height=400,width=800,top=400px,left=400px'
    )
  }


  function checkForTweet() {
    twitterAccount &&
      fetchLatestTweet(twitterAccount)
        .then((res: LatestTweetResponse | null) => {
          if (res?.data[0]) {
            const tweetData = res?.data?.[0];
            // check that tweet contains correct data
            const passedRegex = tweetData.text.includes('sig:' + sig);
            if (passedRegex) {
              setTweetID(tweetData.id);
              setTweetError(undefined);
              setWatch(false);
            } else {
              startWatching();
            }
          } else {
            startWatching();
          }
        })
        .catch(() => {
          startWatching();
        })
  }

  async function onVerify() {
    //reset error and loading state
    setAttempting(true);
    setRequestError(undefined);
    
    // if callback not returned properly ignore
    if (!verifyCallback || !account || !tweetID) return;

    const res = await verifyCallback();

    // if error, display for user, if not update verified handle
    if (res.error || !res.success) {
      setRequestError(res.error);
      setAttempting(false);
      
    } else if (res.success && twitterAccount) {
      const newVerified: any = {};
      
      verifiedHandles &&
        allIndentities &&
        Object.keys(verifiedHandles).map((address) => {
          newVerified[address] = allIndentities[address]
          return true
        });
      // reset global list of verified handles to account for new entry
      if (newVerified && allIndentities) {
        newVerified[account] = {
          ...allIndentities[account],
          twitter: {
            tweetID,
            handle: twitterAccount,
            timestamp: Date.now(),
          },
        }
        
        setAllIdentities(newVerified);
      }
      setVerified(true);
    }
  }
  /**
   * Render
   */

  return (
    <>
    <Modal isOpen={showTwitterFlow} isOpenHandler={() => setShowTwitterFlow(false)} keyProp="" >
      <>
        {!sig ? (
          <>
            <h3>Step 1: Sign Message</h3>
            <small>Sign in with Twitter to link your Ethereum address and Twitter handle.</small>
            <TwitterAccountPreview />
            <ButtonPrimary onClick={signMessage}>Sign</ButtonPrimary>
            {sigError && <TYPE.error error={true}>{sigError}</TYPE.error>}
          </>
        ): !tweetID ? (
          <>
            <h3>Step 2: Step 2: Announce</h3>
            <small>Sign in with Twitter to link your Ethereum address and Twitter handle.</small>
            <TwitterAccountPreview />
            <TweetWrapper>{readableTweetCopy}</TweetWrapper>
            <ButtonPrimary onClick={checkForTweet}>
              {watch ? "Looking for tweet ": tweetError ? 'Check again' : 'Tweet This'}
            </ButtonPrimary>
            {tweetError && <TYPE.error error={true}>{tweetError}</TYPE.error>}
          </>
        ) : !verified && !attempting ? (
          <>
            <h3>Step 3: Submit</h3>
            <small>Verify your tweet and add your handle to the list of verified mappings.</small>
            <Tweet tweetId={tweetID} />
            <ButtonPrimary onClick={onVerify} disabled={!account || !tweetID || !sig}>
              Submit
            </ButtonPrimary>
            {requestError && <TYPE.error error={true}>{requestError}</TYPE.error>}
          </>
        ) : (
          <>
            <h3>Verification Successful</h3>
          </>
        )}
       
      </>
    </Modal>
      <div tabIndex={0} className="nav__hamburger-wrapper">
        <div
          className="nav__hamburger"
          aria-label="Menu"
          aria-controls="navigation"
          onClick={(event) => {
            event.preventDefault();
            handleMenuModalClose(true);
          }}>
          <HamburgerSVG />
        </div>
      </div>

      {/** MODAL MENU */}
      <ReactModal
        ariaHideApp={false}
        className="nav-modal-container"
        isOpen={shouldShowMenuModal}
        onRequestClose={() => {
          handleMenuModalClose(false);
        }}
        overlayClassName="nav-modal-overlay"
        role="dialog"
        style={{overlay: {zIndex: '99'}} as any}>
        <Transition appear in={shouldShowMenuModal} timeout={duration}>
          {(transition) => (
            <nav role="navigation" id="navigation">
              <div
                style={{
                  ...defaultStyle,
                  ...transitionStyles[transition],
                }}
                className="nav-modal">
                <button
                  className="modal__close-button modal__close-button--icon"
                  onClick={(event) => {
                    event.preventDefault();
                    handleMenuModalClose(false);
                  }}>
                  <TimesSVG />
                </button>

                <ModalLogo />

                <div className="nav-modal__walletconnect-button-container">
                  <Web3ModalButton />
                  { !verifiedHandleEntry && account ? (
                    !twitterAccount ? <TwitterLoginButton text="Add a public identity" /> : (
                      <TwitterButton
                        onClick={() => {
                          setShowTwitterFlow(true)
                        }}
                      >
                        <RowBetween>
                          <TYPE.white fontSize="14px">Add a public identity</TYPE.white>
                          <TwitterLogo src={TwitterIcon} />
                        </RowBetween>
                      </TwitterButton>
                    )
                  ) : null }
                </div>
                <ul className="nav__list">
                  <li
                    onClick={() => {
                      handleMenuModalClose(false);
                    }}>
                    <NavLink to="/membership">
                      <span>Membership</span>
                    </NavLink>
                  </li>
                  <li
                    onClick={() => {
                      handleMenuModalClose(false);
                    }}>
                    <NavLink to="/governance">
                      <span>Governance</span>
                    </NavLink>
                  </li>
                  <li
                    onClick={() => {
                      handleMenuModalClose(false);
                    }}>
                    <NavLink to="/transfers">
                      <span>Transfer</span>
                    </NavLink>
                  </li>
                  <li
                    onClick={() => {
                      handleMenuModalClose(false);
                    }}>
                    <NavLink to="/movements">
                      <span>Movement</span>
                    </NavLink>
                  </li>
                  <li
                    onClick={() => {
                      handleMenuModalClose(false);
                    }}>
                    <NavLink to="/unagii-vaults">
                      <span>Unagii Vaults</span>
                    </NavLink>
                  </li>
                  <li
                    onClick={() => {
                      handleMenuModalClose(false);
                    }}>
                    <NavLink to="/tributes">
                      <span>Tribute</span>
                    </NavLink>
                  </li>
                  {/* The Profile link is available to only the connected member user (not any delegate) because the profile exists for the member account. */}
                  {isCurrentMemberConnected && (
                    <li
                      onClick={() => {
                        handleMenuModalClose(false);
                      }}>
                      <NavLink to={`/members/${account}`}>
                        <span>Profile</span>
                      </NavLink>
                    </li>
                  )}
                  {/* The Manage DAO link is available to both connected member users and connected delegate users. */}
                  {isCurrentMemberOrDelegateConnected && (
                    <li
                      onClick={() => {
                        handleMenuModalClose(false);
                      }}>
                      <NavLink to="/dao-manager">
                        <span>Manage DAO</span>
                      </NavLink>
                    </li>
                  )}
                </ul>
              </div>
            </nav>
          )}
        </Transition>
      </ReactModal>
    </>
  );
}

export default function Nav() {
  /**
   * Render
   */

  return (
    <Media query="(max-width: 62em)">
      {(_matches: boolean) => (
        <div className="nav-header">
          <div className="nav-header__menu-container">
            {/* NAV */}
            <NavLinks />
            <DaoTokenHolder border={'1px solid #c3d6dc'} />
            <NavHamburger />
            <div className="nav-header__walletconnect-button-container">
              <Web3ModalButton />
            </div>
          </div>
        </div>
      )}
    </Media>
  );
}
