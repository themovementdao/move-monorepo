import {useHistory} from 'react-router-dom';

import { DaoAdapterConstants } from "../../components/adapters-extensions/enums";
import FadeIn from "../../components/common/FadeIn";
import Wrap from "../../components/common/Wrap";
import Proposals from "../../components/proposals/Proposals";


export default function UnagiiVaults(): JSX.Element {
    function proposalLinkPath(id: string) {
        return `/unagii-vaults/${id}`;
    }

    return (
        <RenderWrapper>
          <h2>Unagii Vaults Deposit</h2>
          <Proposals
            adapterName={DaoAdapterConstants.UNAGII_DEPOSIT}
            proposalLinkPath={proposalLinkPath}
          />
          <h2>Unagii Vaults Withdraw</h2>
          <Proposals
            adapterName={DaoAdapterConstants.UNAGII_WITHDRAW}
            proposalLinkPath={proposalLinkPath}
          />
        </RenderWrapper>
      );
}

function RenderWrapper(props: React.PropsWithChildren<any>): JSX.Element {
    const history = useHistory();

    function goToNewProposal(event: React.MouseEvent<HTMLButtonElement>, action: string) {
        event.preventDefault();
        history.push(`/unagii-vaults/${action}`);
    }

    return (
      <Wrap className="section-wrapper">
        <FadeIn>
          <div className="titlebar">
            <h2 className="titlebar__title">Unagii Vaults</h2>
            <div className="button-action">
              <button className="titlebar__action" onClick={(e) => goToNewProposal(e, 'deposit')}>
                Make deposit
              </button>
              <button className="titlebar__action" onClick={(e) => goToNewProposal(e, 'withdraw')}>
                Make withdraw
              </button>
            </div>
          </div>
          {props.children}
        </FadeIn>
      </Wrap>
    );
}
  