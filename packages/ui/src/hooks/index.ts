import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

export * from './useAbortController';
export * from './useCounter';
export * from './useDao';
export * from './useDaoConfigurations';
export * from './useDaoTotalUnits';
export * from './useIsMounted';
export * from './useMemberActionDisabled';
export * from './useMemberUnitsAtSnapshot';
export * from './useRedeemCoupon';
export * from './useTimeStartEnd';

export function useTheme() {
    const theme = useContext(ThemeContext);
    return theme;
}