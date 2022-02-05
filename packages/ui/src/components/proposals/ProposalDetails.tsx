import {ProposalData} from './types';

import {truncateEthAddress} from '../../util/helpers';
import Markdown from 'markdown-to-jsx';


type ProposalDetailsProps = {
  proposal: ProposalData;
  /**
   * A render prop to render amount(s) badge.
   */
  renderAmountBadge?: () => React.ReactNode;
  /**
   * A render prop to render any action button flows for a proposal.
   */
  renderActions: () => React.ReactNode;
};

export default function ProposalDetails(props: ProposalDetailsProps) {
  const {proposal, renderAmountBadge, renderActions} = props;

  const commonData = proposal.getCommonSnapshotProposalData();

  const isMetadata = commonData ? Object.keys(commonData.msg.payload.metadata).length === 12 ? true : false : false;

  const metaDataName = {
    annualizedDeflationFee: { title: "Annualized Deflation Fee", suffix: "%" },
    fixedBuySideTransactionFee: {title:"Fixed Buy Side Transaction Fee", suffix: "%"},
    fixedSellSideTransactionFee: {title:"Fixed Sell Side Transaction Fee", suffix: "%"},
    fundingGoal: {title:"Funding Goal", suffix: "$"},
    projectVotingPeriod: {title:"Project Voting Period", suffix: "weeks"},
    shortDescription: {title:"Short Description", suffix: null},
    startPrice: {title:"Start Price", suffix: "$"},
    startingReservers: {title:"Starting Reservers", suffix: "$"},
    stopPrice: {title:"Stop Price", suffix: "$"},
    sypplementalVestingPenalty: {title:"Sypplemental Vesting Penalty", suffix: "%"},
    tokenSymbol: {title:"Token Symbol", suffix: null},
    vestingPeriod: {title:"Vesting period", suffix: "weeks"},
  };

  const renderMetaData = () => {
    if (commonData && isMetadata) {
      const keys = Object.keys(commonData.msg.payload.metadata);
      return keys.map((key, index) => {
        return (
          <p key={index}> <b>{metaDataName[key] ? metaDataName[key].title : null}</b> : {commonData.msg.payload.metadata[key]} {metaDataName[key] ? metaDataName[key].suffix : null} </p>
        );
      }) 
    }
    return null;
  }
  
  /**
   * Render
   */

  if (!commonData) {
    return null;
  }

  return (
    <>
      <div className="proposaldetails__header">Proposal Details</div>
      <div className="proposaldetails">
        {/* PROPOSAL NAME (an address in most cases) AND BODY */}
        <div className="proposaldetails__content">
          <h3>
            {/* @note If the proposal title is not an address it will fall back to a normal, non-truncated string. */}
            {truncateEthAddress(commonData.msg.payload.name || '', 7)}
          </h3>
          { isMetadata ? renderMetaData() : null }
          <Markdown>{commonData.msg.payload.body}</Markdown>
        </div>

        {/* SIDEBAR */}
        <div className="proposaldetails__status">
          {/* AMOUNT(S) IF RELEVANT FOR PROPOSAL */}
          {renderAmountBadge && renderAmountBadge()}

          {/* SPONSOR & VOTING ACTIONS */}
          {renderActions()}
        </div>
      </div>
    </>
  );
}
