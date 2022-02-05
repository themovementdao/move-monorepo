import { expect } from "chai";

import { toBN, UNITS } from "./contract-util";

import { advanceTime } from './hardhat-test-util';

export const checkLastEvent = async (dao, testObject) => {
  let pastEvents = await dao.getPastEvents();
  let returnValues = pastEvents[0].returnValues;

  Object.keys(testObject).forEach((key) =>
    expect(testObject[key], "value mismatch for key " + key).equal(
      returnValues[key]
    )
  );
};

export const checkBalance = async (bank, address, token, expectedBalance) => {
  const balance = await bank.balanceOf(address, token);
  console.log("GUILD balance: ", balance.toString());
  console.log("Expect balance: ", expectedBalance.toString());

  expect(balance.toString()).equal(expectedBalance.toString());
};

export const checkSignature = async (
  signatureExtension,
  permissionHash,
  signature,
  magicValue
) => {
  const returnedValue = await signatureExtension.isValidSignature(
    permissionHash,
    signature
  );

  expect(returnedValue).equal(magicValue);
};

export const isMember = async (bank, member) => {
  const units = await bank.balanceOf(member, UNITS);
  return units > toBN("0");
};

export const submitNewMemberProposal = async (
  proposalId,
  member,
  onboarding,
  dao,
  newMember,
  unitPrice,
  token,
  desiredUnits = toBN(10)
) => {
  await onboarding.submitProposal(
    dao.address,
    proposalId,
    newMember,
    token,
    unitPrice.mul(desiredUnits),
    [],
    {
      from: member
    }
  );
};

export const onboardingNewMember = async (
  proposalId,
  dao,
  onboarding,
  voting,
  newMember,
  sponsor,
  unitPrice,
  token,
  desiredUnits = toBN(10)
) => {
  await submitNewMemberProposal(
    proposalId,
    sponsor,
    onboarding,
    dao,
    newMember,
    unitPrice,
    token,
    desiredUnits
  );

  //vote and process it
  await voting.submitVote(dao.address, proposalId, 1, {
    from: sponsor
  });
  await advanceTime(10000);

  await onboarding.processProposal(dao.address, proposalId, {
    from: sponsor,
    value: unitPrice.mul(desiredUnits)
  });
};

export const guildKickProposal = async (
  dao,
  guildkickContract,
  memberToKick,
  sender,
  proposalId
) => {
  await guildkickContract.submitProposal(
    dao.address,
    proposalId,
    memberToKick,
    [],
    {
      from: sender,

    }
  );
};

export const submitConfigProposal = async (
  dao,
  proposalId,
  sender,
  configuration,
  voting,
  configKeys,
  configValues
) => {
  //Submit a new configuration proposal
  await configuration.submitProposal(
    dao.address,
    proposalId,
    configKeys,
    configValues,
    [],
    { from: sender }
  );

  await voting.submitVote(dao.address, proposalId, 1, {
    from: sender,

  });

  await advanceTime(10000);
  await configuration.processProposal(dao.address, proposalId, {
    from: sender,

  });
};

