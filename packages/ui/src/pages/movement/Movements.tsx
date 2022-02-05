import {useHistory} from 'react-router-dom';

import { DaoAdapterConstants } from "../../components/adapters-extensions/enums";
import FadeIn from "../../components/common/FadeIn";
import Wrap from "../../components/common/Wrap";
import ListMovement from '../../components/movements/ListMovement';
import Proposals from "../../components/proposals/Proposals";


export default function Movements(): JSX.Element {
    function proposalLinkPath(id: string) {
        return `/movements/${id}`;
    }

    return (
        <RenderWrapper>
          <Proposals
            adapterName={DaoAdapterConstants.MOVEMENT}
            proposalLinkPath={proposalLinkPath}
          />
          <ListMovement />
        </RenderWrapper>
      );
}

function RenderWrapper(props: React.PropsWithChildren<any>): JSX.Element {
    const history = useHistory();

    function goToNewProposal(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        history.push('/movement');
    }

    return (
        <Wrap className="section-wrapper">
        <FadeIn>
          <div className="titlebar">
            <h2 className="titlebar__title">Movements</h2>
            <button className="titlebar__action" onClick={goToNewProposal}>
              Make Movement
            </button>
          </div>
          {props.children}
        </FadeIn>
      </Wrap>
    );
}
  