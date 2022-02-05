import styled from 'styled-components'
import TwitterIcon from '../../assets/images/Twitter_Logo_Blue.png'

const VERIFY_TWITTER_LINK = process.env.REACT_APP_VERIFY_TWITTER_LINK;

export const VerifyButton = styled.a`
  background-color: #2172E5;
  padding: 8px;
  outline: none;
  border: 1px solid transparent;
  border-radius: 12px;
  text-decoration: none;
  font-size: 14px;
  :hover {
    cursor: pointer;
    opacity: 0.8;
  }
`;

const TwitterLogo = styled.img`
  height: 20px;
  width: 20px;
`;

const TextTwitter = styled.span`
    color: #FFFFFF;
    box-sizing: border-box;
    margin: 0;
    min-width: 0;
    font-weight: 500;
    color: white;
`;

const Row = styled.div`
    box-sizing: border-box;
    margin: 0;
    min-width: 0;
    width: 100%;
    display: flex;
    padding: 0;
    align-items: center;
    justify-content: flex-start;
    justify-content: space-between;
`;

export default function TwitterLoginButton({ text }: { text: string }) {
  return (
    <VerifyButton href={VERIFY_TWITTER_LINK}>
        <Row>
            <TextTwitter>{text}</TextTwitter>
            <TwitterLogo src={TwitterIcon} />
        </Row>
    </VerifyButton>
  )
}
