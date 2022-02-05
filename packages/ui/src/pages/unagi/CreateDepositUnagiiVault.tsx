import { prepareVoteProposalData, SnapshotProposalData, SnapshotType } from "@openlaw/snapshot-js-erc712";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import FadeIn from "../../components/common/FadeIn";
import InputError from "../../components/common/InputError";
import Wrap from "../../components/common/Wrap";
import Loader from "../../components/feedback/Loader";
import { useSignAndSubmitProposal } from "../../components/proposals/hooks";
import { useContractSend, useETHGasPrice } from "../../components/web3/hooks";
import { ContractAdapterNames } from "../../components/web3/types";
import { StoreState } from "../../store/types";
import { FormFieldErrors } from "../../util/enums";
import { formatNumber, getValidationError, stripFormatNumber } from "../../util/helpers";
import { useUnagiiVaults } from "./hooks/useUngaiiVaults";

enum Fields {
    token = 'token',
    amount = 'amount'
}
type FormInputs = {
    token: string;
    amount: number;
};
  
type TransferArguments = [
    string, // `dao`
    string, // `proposalId`
    string, //
    string, // 
    string // `data`
];

export default function CreateDepositUnagiiVault(): JSX.Element {
    
    const history = useHistory();
    const bankExtension = useSelector(
        (state: StoreState) => state.contracts?.BankExtensionContract
    );

    const UnagiiDepositAdapter = useSelector(
        (state: StoreState) => state.contracts?.UnagiiDeposit
    );

    const DaoRegistryContract = useSelector(
        (state: StoreState) => state.contracts?.DaoRegistryContract
    );

    const { txSend } = useContractSend();

    const {proposalData, signAndSendProposal} = useSignAndSubmitProposal<SnapshotType.proposal>();

    const [balance, setBalance] = useState(0);

    const { UNAGII_DAI_VAULT_ADDRESS, tokenBalance, account, web3Instance } = useUnagiiVaults();

    const form = useForm<FormInputs>({
        mode: 'onBlur',
        reValidateMode: 'onChange',
    });

    const {errors, getValues, setValue, register, trigger, watch} = form;

    useEffect(() => {
        const checkBalance = async () => {
            if (bankExtension?.contractAddress) {
                setBalance(await tokenBalance(bankExtension?.contractAddress));
            }
        }
        checkBalance();
    }, [bankExtension]);

    const [isLoading, setIsLoading] = useState(false);

    const {average: gasPrice} = useETHGasPrice();

    async function handleSubmit(values: FormInputs) {
        try {
            if (!UnagiiDepositAdapter) {
                throw new Error('No UnagiiWithdrawContract found.');
            }
            if (!account) {
                throw new Error('No account found.');
            }
            if (!web3Instance) {
                throw new Error('No Web3 instance was found.');
            }

            setIsLoading(true);

            const { amount } = values;

            let proposalId: string = proposalData?.uniqueId || '';
            let data: SnapshotProposalData | undefined = proposalData?.data;
            let signature: string = proposalData?.signature || '';

            // Only submit to snapshot if there is not already a proposal ID returned from a previous attempt.
            if (!proposalId) {
                const now = Math.floor(Date.now() / 1000);
                const {
                  uniqueId,
                  data: returnData,
                  signature: returnSignature,
                } = await signAndSendProposal({
                    partialProposalData: {
                      name: 'Deposit unagii vaults',
                      body: `Deposit unagii vaults amount ${amount}`,
                      metadata: {
                        amount
                      },
                      timestamp: now.toString(),
                    },
                    adapterName: ContractAdapterNames.unagii_deposit,
                    type: SnapshotType.proposal,
                  });
                proposalId = uniqueId;
                data = returnData;
                signature = returnSignature;
            }

            /**
                * Prepare `data` argument for submission to DAO
                *
                * For information about which data the smart contract needs for signature verification (e.g. `hashMessage`):
                * @link https://github.com/openlawteam/tribute-contracts/blob/master/contracts/adapters/voting/OffchainVoting.sol
            */

            const preparedVoteVerificationBytes = data
                ? prepareVoteProposalData(
                    {
                    payload: {
                        name: data.payload.name,
                        body: data.payload.body,
                        choices: data.payload.choices,
                        snapshot: data.payload.snapshot.toString(),
                        start: data.payload.start,
                        end: data.payload.end,
                    },
                    submitter: account || "",
                    sig: signature,
                    space: data.space,
                    timestamp: parseInt(data.timestamp),
                    },
                    web3Instance
                )
                : '';
            
            const transferArguments: TransferArguments = [
                DaoRegistryContract?.contractAddress || '',
                proposalId,
                UNAGII_DAI_VAULT_ADDRESS, 
                web3Instance.utils.toBN(amount).toString(),
                preparedVoteVerificationBytes
            ];    
            const txArguments = {
                from: account || '',
                ...(gasPrice ? {gasPrice} : null),
            };

            // Execute contract call for `submitProposal`
            await txSend(
                'submitProposal',
                UnagiiDepositAdapter.instance.methods,
                transferArguments,
                txArguments
            );


            // go to TransferDetails page for newly created transfer proposal
            history.push(`/unagii-vaults/${proposalId}`);

        } catch(errors) {
            console.log(errors);
            setIsLoading(false);

        }
    }

    return (
        <RenderWrapper>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
                {/* TYPE */}
                    <div className="form__input-row">
                        <label className="form__input-row-label">Token</label>
                        <div className="form__input-row-fieldwrap">
                            <select
                                name={Fields.token}
                                ref={register}
                            >
                                <option value="0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735">Dai Stablecoin</option>
                            </select>
                        </div>
                    </div>
                {/* AMOUNT */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Amount</label>
                <div className="form__input-row-fieldwrap--narrow">
                    <div className="input__suffix-wrap">
                    <input
                        className="input__suffix"
                        aria-describedby={`error-${Fields.amount}`}
                        aria-invalid={errors.amount ? 'true' : 'false'}
                        name={Fields.amount}
                        onChange={() =>
                        setValue(Fields.amount, formatNumber(getValues().amount))
                        }
                        ref={register({
                        validate: (amount: string): string | boolean => {
                            const amountToNumber = Number(stripFormatNumber(amount));
                            return amount === ''
                            ? FormFieldErrors.REQUIRED
                            : isNaN(amountToNumber)
                            ? FormFieldErrors.INVALID_NUMBER
                            : amountToNumber <= 0
                            ? 'The value must be greater than 0.'
                            : !Number.isInteger(amountToNumber)
                            ? 'The value must be an integer for an ERC20 token.'
                            : true;
                        },
                        })}
                        type="text"
                    />

                    <div className="input__suffix-item">
                        DAI
                    </div>
                    </div>

                    <InputError
                        error={getValidationError(Fields.amount, errors)}
                        id={`error-${Fields.amount}`}
                    />

                    <div className="form__input-description">
                    </div>
                </div>

                <div className="form__input-addon">
                    available: <span> {balance}</span>
                </div>
                </div>
                 {/* SUBMIT */}
                 <button
                    className="button"
                    onClick={() => {
                        handleSubmit(getValues());
                    }}
                    type="submit">
                    {isLoading ? <Loader /> : false ? 'Done' : 'Submit'}
                </button>          
            </form>
        </RenderWrapper>
    );
}


function RenderWrapper(props: React.PropsWithChildren<any>): JSX.Element {
    /**
     * Render
     */
    return (
      <Wrap className="section-wrapper">
        <FadeIn>
          <div className="titlebar">
            <h2 className="titlebar__title">Unagii Vault Deposit Proposal</h2>
          </div>
  
          <div className="form-wrapper">
            <div className="form__description">
              <p>
                Nulla aliquet porttitor venenatis. Donec a dui et dui fringilla
                consectetur id nec massa. Aliquam erat volutpat. Sed ut dui ut
                lacus dictum fermentum vel tincidunt neque. Sed sed lacinia...
              </p>
            </div>
            {/* RENDER CHILDREN */}
            {props.children}
          </div>
        </FadeIn>
      </Wrap>
    );
  }
  