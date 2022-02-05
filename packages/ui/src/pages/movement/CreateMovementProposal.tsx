import { prepareVoteProposalData, SnapshotProposalData, SnapshotType } from '@openlaw/snapshot-js-erc712';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';

import FadeIn from "../../components/common/FadeIn";
import InputError from '../../components/common/InputError';
import Wrap from "../../components/common/Wrap";
import Loader from '../../components/feedback/Loader';
import { useSignAndSubmitProposal } from '../../components/proposals/hooks';
import { useContractSend, useETHGasPrice, useWeb3Modal } from '../../components/web3/hooks';
import { ContractAdapterNames } from '../../components/web3/types';
import { StoreState } from '../../store/types';
import { FormFieldErrors } from '../../util/enums';
import { formatNumber, getValidationError, stripFormatNumber } from '../../util/helpers';

enum Fields {
    type = 'type',
    tokenSymbol = 'tokenSymbol',
    shortDescription = 'shortDescription',
    name = 'name',
    amount = 'amount',
    description = 'description',
    fundingGoal = 'fundingGoal',
    startingReservers = 'startingReservers',
    startPrice = 'startPrice',
    stopPrice = 'stopPrice',
    annualizedDeflationFee = 'annualizedDeflationFee',
    fixedBuySideTransactionFee = 'fixedBuySideTransactionFee',
    fixedSellSideTransactionFee = 'fixedSellSideTransactionFee',
    vestingPeriod = 'vestingPeriod',
    sypplementalVestingPenalty = 'sypplementalVestingPenalty',
    projectVotingPeriod = 'projectVotingPeriod'
}

type FormInputs = {
    tokenSymbol: string;
    shortDescription: string;
    name: string;
    description: string;
    fundingGoal: number;
    startingReservers: number;
    startPrice: number;
    stopPrice: number;
    annualizedDeflationFee: number;
    fixedBuySideTransactionFee: number;
    fixedSellSideTransactionFee: number;
    vestingPeriod: number;
    sypplementalVestingPenalty: number;
    projectVotingPeriod: number;
};

type TransferArguments = [
    string, // `dao`
    string, // `proposalId`
    { tokenSymbol: string; name: string; tokenName: string; },
    string // `data`
];


export default function CreateMovementProposal() {

    const history = useHistory();

    const { connected, account, web3Instance } = useWeb3Modal();

    const MovementContract = useSelector(
        (state: StoreState) => state.contracts?.MovementContract
    );

    const DaoRegistryContract = useSelector(
        (state: StoreState) => state.contracts?.DaoRegistryContract
    );

    const { proposalData, proposalSignAndSendStatus, signAndSendProposal } =
        useSignAndSubmitProposal<SnapshotType.proposal>();

    const { average: gasPrice } = useETHGasPrice();

    const { txError, txEtherscanURL, txIsPromptOpen, txSend, txStatus } = useContractSend();

    /**
    * Their hooks
    */

    const form = useForm<FormInputs>({
        mode: 'onBlur',
        reValidateMode: 'onChange',
    });

    const { errors, getValues, setValue, register, trigger, watch } = form;

    const [submitError, setSubmitError] = useState<Error | any>();
    const [isInProcess, setIsInProcess] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const isInProcessOrDone = false;

    const isConnected = connected && account;

    async function handleSubmit(values: FormInputs) {
        try {
            if (!isConnected) {
                throw new Error('No user account was found. Please make sure your wallet is connected.');
            }
            if (!MovementContract) {
                throw new Error('No MovementContract found.');
            }
            if (!account) {
                throw new Error('No account found.');
            }
            if (!web3Instance) {
                throw new Error('No Web3 instance was found.');
            }

            const {
                tokenSymbol,
                shortDescription,
                name,
                description,
                fundingGoal,
                startingReservers,
                startPrice,
                stopPrice,
                annualizedDeflationFee,
                fixedBuySideTransactionFee,
                fixedSellSideTransactionFee,
                vestingPeriod,
                sypplementalVestingPenalty,
                projectVotingPeriod
            } = values;

            const dataArgs = {
                fundingGoal,
                startingReservers,
                startPrice,
                stopPrice,
                annualizedDeflationFee,
                fixedBuySideTransactionFee,
                fixedSellSideTransactionFee,
                vestingPeriod,
                sypplementalVestingPenalty,
                projectVotingPeriod
            };

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
                        name,
                        body: description,
                        metadata: {
                            tokenSymbol,
                            shortDescription,
                            fundingGoal,
                            startingReservers,
                            startPrice,
                            stopPrice,
                            annualizedDeflationFee,
                            fixedBuySideTransactionFee,
                            fixedSellSideTransactionFee,
                            vestingPeriod,
                            sypplementalVestingPenalty,
                            projectVotingPeriod
                        },
                        timestamp: now.toString(),
                    },
                    adapterName: ContractAdapterNames.movement,
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
                { tokenName: "test-token", tokenSymbol, name },
                preparedVoteVerificationBytes
            ];

            const txArguments = {
                from: account || '',
                ...(gasPrice ? { gasPrice } : null),
            };

            // Execute contract call for `submitProposal`
            await txSend(
                'submitProposal',
                MovementContract.instance.methods,
                transferArguments,
                txArguments
            );

            // go to TransferDetails page for newly created transfer proposal
            history.push(`/movements/${proposalId}`);

        } catch (errors) {
            console.log(errors);

            setSubmitError(errors);
        }
    }

    return (
        <RenderWrapper>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
                {/* Name */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Name</label>
                    <div className="form__input-row-fieldwrap">
                        <input
                            aria-describedby={`error-${Fields.name}`}
                            aria-invalid={errors.name ? 'true' : 'false'}
                            name={Fields.name}
                            placeholder="Turtle Nation"
                            ref={register({
                                validate: async (
                                    name: string
                                ): Promise<string | boolean> => {
                                    return !name
                                        ? FormFieldErrors.REQUIRED
                                        : name.length > 30
                                            ? FormFieldErrors.MAX_LENGHT_STRING
                                            : true;
                                },
                            })}
                            type="text"
                            disabled={isInProcessOrDone}
                        />
                        <small>30 characters max</small>
                        <InputError
                            error={getValidationError(Fields.name, errors)}
                            id={`error-${Fields.name}`}
                        />
                    </div>
                </div>
                {/* Short Description */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Short Description</label>
                    <div className="form__input-row-fieldwrap">
                        <input
                            aria-describedby={`error-${Fields.shortDescription}`}
                            aria-invalid={errors.shortDescription ? 'true' : 'false'}
                            name={Fields.shortDescription}
                            placeholder="Bringing visability to the turtles."
                            ref={register({
                                validate: async (
                                    shortDescription: string
                                ): Promise<string | boolean> => {
                                    return !shortDescription
                                        ? FormFieldErrors.REQUIRED
                                        : shortDescription.length > 140
                                            ? FormFieldErrors.MAX_LENGHT_STRING
                                            : true;
                                },
                            })}
                            type="text"
                            disabled={isInProcessOrDone}
                        />
                        <small>140 characters max</small>
                        <InputError
                            error={getValidationError(Fields.shortDescription, errors)}
                            id={`error-${Fields.shortDescription}`}
                        />
                    </div>
                </div>
                {/* Token Symbol */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Token Symbol</label>
                    <div className="form__input-row-fieldwrap">
                        <input
                            aria-describedby={`error-${Fields.tokenSymbol}`}
                            aria-invalid={errors.tokenSymbol ? 'true' : 'false'}
                            name={Fields.tokenSymbol}
                            placeholder="TED"
                            ref={register({
                                validate: async (
                                    tokenSymbol: string
                                ): Promise<string | boolean> => {
                                    return !tokenSymbol
                                        ? FormFieldErrors.REQUIRED
                                        : tokenSymbol.length > 4
                                            ? FormFieldErrors.MAX_LENGHT_STRING
                                            : true;
                                },
                            })}
                            type="text"
                            disabled={isInProcessOrDone}
                        />
                        <small>4 characters max</small>
                        <InputError
                            error={getValidationError(Fields.tokenSymbol, errors)}
                            id={`error-${Fields.tokenSymbol}`}
                        />
                    </div>
                </div>
                {/* Description */}
                <div className="form__textarea-row">
                    <label className="form__input-row-label">Description</label>
                    <div className="form__input-row-fieldwrap">
                        <textarea
                            name={Fields.description}
                            placeholder="Transactions purpose..."
                            ref={register}
                            disabled={isInProcessOrDone}
                        />
                    </div>
                </div>
                {/* Funding Goal */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Funding Goal</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.fundingGoal}`}
                                aria-invalid={errors.fundingGoal ? 'true' : 'false'}
                                name={Fields.fundingGoal}
                                placeholder="50,000"
                                onChange={() =>
                                    setValue(Fields.fundingGoal, formatNumber(getValues().fundingGoal))
                                }
                                ref={register({
                                    validate: (fundingGoal: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(fundingGoal));
                                        return fundingGoal === ''
                                            ? FormFieldErrors.REQUIRED
                                            : isNaN(amountToNumber)
                                                ? FormFieldErrors.INVALID_NUMBER
                                                : amountToNumber <= 0
                                                    ? 'The value must be greater than 0.'
                                                    : !Number.isInteger(amountToNumber)
                                                        ? 'The value must be an integer for an ERC20 token.'
                                                        : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                $
                            </div>
                        </div>
                        <small>Numbers only</small>

                        <InputError
                            error={getValidationError(Fields.fundingGoal, errors)}
                            id={`error-${Fields.fundingGoal}`}
                        />
                    </div>
                </div>
                {/* Starting Reservers */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Starting Reservers</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.startingReservers}`}
                                aria-invalid={errors.startingReservers ? 'true' : 'false'}
                                name={Fields.startingReservers}
                                placeholder="1,000"
                                onChange={() =>
                                    setValue(Fields.startingReservers, formatNumber(getValues().startingReservers))
                                }
                                ref={register({
                                    validate: (startingReservers: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(startingReservers));
                                        return startingReservers === ''
                                            ? FormFieldErrors.REQUIRED
                                            : isNaN(amountToNumber)
                                                ? FormFieldErrors.INVALID_NUMBER
                                                : amountToNumber <= 0
                                                    ? 'The value must be greater than 0.'
                                                    : !Number.isInteger(amountToNumber)
                                                        ? 'The value must be an integer for an ERC20 token.'
                                                        : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                $
                            </div>
                        </div>
                        <small>Numbers only</small>

                        <InputError
                            error={getValidationError(Fields.startingReservers, errors)}
                            id={`error-${Fields.startingReservers}`}
                        />
                    </div>
                </div>
                {/* Start Price */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Start Price</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.startPrice}`}
                                aria-invalid={errors.startPrice ? 'true' : 'false'}
                                name={Fields.startPrice}
                                placeholder="0.001"
                                onChange={() =>
                                    setValue(Fields.startPrice, formatNumber(getValues().startPrice))
                                }
                                ref={register({
                                    validate: (startPrice: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(startPrice));
                                        return startPrice === ''
                                            ? FormFieldErrors.REQUIRED
                                            : isNaN(amountToNumber)
                                                ? FormFieldErrors.INVALID_NUMBER
                                                : amountToNumber <= 0
                                                    ? 'The value must be greater than 0.'
                                                    : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                $
                            </div>
                        </div>
                        <small>Numbers only</small>

                        <InputError
                            error={getValidationError(Fields.startPrice, errors)}
                            id={`error-${Fields.startPrice}`}
                        />
                    </div>
                </div>
                {/* Stop Price */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Stop Price</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.stopPrice}`}
                                aria-invalid={errors.stopPrice ? 'true' : 'false'}
                                name={Fields.stopPrice}
                                placeholder="5"
                                onChange={() =>
                                    setValue(Fields.stopPrice, formatNumber(getValues().stopPrice))
                                }
                                ref={register({
                                    validate: (stopPrice: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(stopPrice));
                                        return isNaN(amountToNumber)
                                            ? FormFieldErrors.INVALID_NUMBER
                                            : amountToNumber <= 0
                                                ? 'The value must be greater than 0.'
                                                : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                $
                            </div>
                        </div>
                        <small>OPTIONAL. Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.stopPrice, errors)}
                            id={`error-${Fields.stopPrice}`}
                        />
                    </div>
                </div>
                {/* Annualized Deflation Fee */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Annualized Deflation Fee</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.annualizedDeflationFee}`}
                                aria-invalid={errors.annualizedDeflationFee ? 'true' : 'false'}
                                name={Fields.annualizedDeflationFee}
                                placeholder="5"
                                onChange={() =>
                                    setValue(Fields.annualizedDeflationFee, formatNumber(getValues().annualizedDeflationFee))
                                }
                                ref={register({
                                    validate: (annualizedDeflationFee: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(annualizedDeflationFee));
                                        return isNaN(amountToNumber)
                                            ? FormFieldErrors.INVALID_NUMBER
                                            : amountToNumber <= 0
                                                ? 'The value must be greater than 0.'
                                                : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                %
                            </div>
                        </div>
                        <small>OPTIONAL. Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.annualizedDeflationFee, errors)}
                            id={`error-${Fields.annualizedDeflationFee}`}
                        />
                    </div>
                </div>
                {/* Fixed Buy Side Transaction Fee */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Fixed Buy Side Transaction Fee</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.fixedBuySideTransactionFee}`}
                                aria-invalid={errors.fixedBuySideTransactionFee ? 'true' : 'false'}
                                name={Fields.fixedBuySideTransactionFee}
                                placeholder="0.25"
                                onChange={() =>
                                    setValue(Fields.fixedBuySideTransactionFee, formatNumber(getValues().fixedBuySideTransactionFee))
                                }
                                ref={register({
                                    validate: (fixedBuySideTransactionFee: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(fixedBuySideTransactionFee));
                                        return isNaN(amountToNumber)
                                            ? FormFieldErrors.INVALID_NUMBER
                                            : amountToNumber <= 0
                                                ? 'The value must be greater than 0.'
                                                : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                %
                            </div>
                        </div>
                        <small>OPTIONAL. Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.fixedBuySideTransactionFee, errors)}
                            id={`error-${Fields.fixedBuySideTransactionFee}`}
                        />
                    </div>
                </div>
                {/* Fixed Sell Side Transaction Fee */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Fixed Sell Side Transaction Fee</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.fixedSellSideTransactionFee}`}
                                aria-invalid={errors.fixedSellSideTransactionFee ? 'true' : 'false'}
                                name={Fields.fixedSellSideTransactionFee}
                                placeholder="0.50"
                                onChange={() =>
                                    setValue(Fields.fixedSellSideTransactionFee, formatNumber(getValues().fixedSellSideTransactionFee))
                                }
                                ref={register({
                                    validate: (fixedSellSideTransactionFee: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(fixedSellSideTransactionFee));
                                        return isNaN(amountToNumber)
                                            ? FormFieldErrors.INVALID_NUMBER
                                            : amountToNumber <= 0
                                                ? 'The value must be greater than 0.'
                                                : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                %
                            </div>
                        </div>
                        <small>OPTIONAL. Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.fixedSellSideTransactionFee, errors)}
                            id={`error-${Fields.fixedSellSideTransactionFee}`}
                        />
                    </div>
                </div>
                {/* Vesting period */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Vesting period</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.vestingPeriod}`}
                                aria-invalid={errors.vestingPeriod ? 'true' : 'false'}
                                name={Fields.vestingPeriod}
                                placeholder="2"
                                onChange={() =>
                                    setValue(Fields.vestingPeriod, formatNumber(getValues().vestingPeriod))
                                }
                                ref={register({
                                    validate: (vestingPeriod: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(vestingPeriod));
                                        return vestingPeriod === ''
                                            ? FormFieldErrors.REQUIRED
                                            : isNaN(amountToNumber)
                                                ? FormFieldErrors.INVALID_NUMBER
                                                : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                weeks
                            </div>
                        </div>
                        <small>Enter "0" to remove vesting. Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.vestingPeriod, errors)}
                            id={`error-${Fields.vestingPeriod}`}
                        />
                    </div>
                </div>
                {/* Sypplemental Vesting Penalty */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Sypplemental Vesting Penalty</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.sypplementalVestingPenalty}`}
                                aria-invalid={errors.sypplementalVestingPenalty ? 'true' : 'false'}
                                name={Fields.sypplementalVestingPenalty}
                                placeholder="20"
                                onChange={() =>
                                    setValue(Fields.sypplementalVestingPenalty, formatNumber(getValues().sypplementalVestingPenalty))
                                }
                                ref={register({
                                    validate: (sypplementalVestingPenalty: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(sypplementalVestingPenalty));
                                        return sypplementalVestingPenalty === ''
                                            ? FormFieldErrors.REQUIRED
                                            : isNaN(amountToNumber)
                                                ? FormFieldErrors.INVALID_NUMBER
                                                : amountToNumber <= 0
                                                    ? 'The value must be greater than 0.'
                                                    : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                %
                            </div>
                        </div>
                        <small>Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.sypplementalVestingPenalty, errors)}
                            id={`error-${Fields.sypplementalVestingPenalty}`}
                        />
                    </div>
                </div>
                {/* Project Voting Period */}
                <div className="form__input-row">
                    <label className="form__input-row-label">Project Voting Period</label>
                    <div className="form__input-row-fieldwrap--narrow">
                        <div className="input__suffix-wrap">
                            <input
                                className="input__suffix"
                                aria-describedby={`error-${Fields.projectVotingPeriod}`}
                                aria-invalid={errors.projectVotingPeriod ? 'true' : 'false'}
                                name={Fields.projectVotingPeriod}
                                placeholder="2"
                                onChange={() =>
                                    setValue(Fields.projectVotingPeriod, formatNumber(getValues().projectVotingPeriod))
                                }
                                ref={register({
                                    validate: (projectVotingPeriod: string): string | boolean => {
                                        const amountToNumber = Number(stripFormatNumber(projectVotingPeriod));
                                        return projectVotingPeriod === ''
                                            ? FormFieldErrors.REQUIRED
                                            : isNaN(amountToNumber)
                                                ? FormFieldErrors.INVALID_NUMBER
                                                : true;
                                    }
                                })}
                                type="text"
                                disabled={isInProcessOrDone}
                            />
                            <div className="input__suffix-item">
                                weeks
                            </div>
                        </div>
                        <small>Numbers only</small>
                        <InputError
                            error={getValidationError(Fields.projectVotingPeriod, errors)}
                            id={`error-${Fields.projectVotingPeriod}`}
                        />
                    </div>
                </div>
                {/* SUBMIT */}
                <button
                    className="button"
                    disabled={isInProcessOrDone}
                    onClick={async () => {
                        if (isInProcessOrDone) return;

                        if (!(await trigger())) {
                            return;
                        }

                        handleSubmit(getValues());
                    }}
                    type="submit">
                    {isInProcess ? <Loader /> : isDone ? 'Done' : 'Next'}
                </button>
            </form>
        </RenderWrapper>
    );
}

function RenderWrapper(props: React.PropsWithChildren<any>): JSX.Element {
    return (
        <Wrap className="section-wrapper">
            <FadeIn>
                <div className="titlebar">
                    <h2 className="titlebar__title">Movement Proposal</h2>
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