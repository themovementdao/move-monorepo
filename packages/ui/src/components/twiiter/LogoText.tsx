/* eslint-disable react/jsx-pascal-case */
import TwitterIcon from '../../assets/images/Twitter_Logo_Blue.png';
import styled from 'styled-components';
import { RowFixed } from '../common/Row';
import { Check } from 'react-feather';
import { useTheme } from '../../hooks';
import { TYPE } from '../../theme';

const Logo = styled.img`
  height: 24px;
  width: 24px;
  margin-left: 0px;
`

const CheckMark = styled(Check)`
  height: 12px;
  width: 12px;
  margin-left: 3px;
`

export default function LogoText({ children, type }: { children?: React.ReactNode; type: string | undefined }) {
  const theme = useTheme();

  if (!type) return <RowFixed>{children}</RowFixed>

  switch (type) {
    case 'twitter':
      return (
        <RowFixed>
          <TYPE.main fontSize="18px">{children}</TYPE.main> <Logo src={TwitterIcon} />
        </RowFixed>
      )
    case 'other':
      return (
        <RowFixed>
          {children} <CheckMark stroke={theme.primary1} strokeWidth="4px" />
        </RowFixed>
      )
    default:
      return <RowFixed>{children}</RowFixed>
  }
}
