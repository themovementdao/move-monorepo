import { sha3 } from './contract-util';
import { extensionsIdsMap } from './dao-ids-util';

export const daoAccessFlagsMap = {
  REPLACE_ADAPTER: "REPLACE_ADAPTER",
  SUBMIT_PROPOSAL: "SUBMIT_PROPOSAL",
  UPDATE_DELEGATE_KEY: "UPDATE_DELEGATE_KEY",
  SET_CONFIGURATION: "SET_CONFIGURATION",
  ADD_EXTENSION: "ADD_EXTENSION",
  REMOVE_EXTENSION: "REMOVE_EXTENSION",
  NEW_MEMBER: "NEW_MEMBER",
  ADD_VETOER: "ADD_VETOER",
  REMOVE_VETOER: "REMOVE_VETOER",
  ADD_SERVICE_PROVIDER: "ADD_SERVICE_PROVIDER",
  REMOVE_SERVICE_PROVIDER: "REMOVE_SERVICE_PROVIDER",
  ADD_MOVEMENT: "ADD_MOVEMENT"
};

export const daoAccessFlags = Object.values(daoAccessFlagsMap);

export const bankExtensionAclFlagsMap = {
  ADD_TO_BALANCE: "ADD_TO_BALANCE",
  SUB_FROM_BALANCE: "SUB_FROM_BALANCE",
  INTERNAL_TRANSFER: "INTERNAL_TRANSFER",
  WITHDRAW: "WITHDRAW",
  REGISTER_NEW_TOKEN: "REGISTER_NEW_TOKEN",
  REGISTER_NEW_INTERNAL_TOKEN: "REGISTER_NEW_INTERNAL_TOKEN",
  UPDATE_TOKEN: "UPDATE_TOKEN",
};

export const bankExtensionAclFlags = Object.values(
  bankExtensionAclFlagsMap
);

export const erc20ExtensionAclFlagsMap = {};

export const erc20ExtensionAclFlags = Object.values(
  erc20ExtensionAclFlagsMap
);

export const erc721ExtensionAclFlagsMap = {
  WITHDRAW_NFT: "WITHDRAW_NFT",
  COLLECT_NFT: "COLLECT_NFT",
  INTERNAL_TRANSFER: "INTERNAL_TRANSFER",
};

export const erc721ExtensionAclFlags = Object.values(
  erc721ExtensionAclFlagsMap
);

export const erc1155ExtensionAclFlagsMap = {
  WITHDRAW_NFT: "WITHDRAW_NFT",
  COLLECT_NFT: "COLLECT_NFT",
  INTERNAL_TRANSFER: "INTERNAL_TRANSFER",
};

export const erc1155ExtensionAclFlags = Object.values(
  erc1155ExtensionAclFlagsMap
);

export const erc1271ExtensionAclFlagsMap = {
  SIGN: "SIGN",
};

export const erc1271ExtensionAclFlags = Object.values(
  erc1271ExtensionAclFlagsMap
);

export const executorExtensionAclFlagsMap = {
  EXECUTE: "EXECUTE",
};

export const executorExtensionAclFlags = Object.values(
  executorExtensionAclFlagsMap
);

export const vestingExtensionAclFlagsMap = {
  NEW_VESTING: "NEW_VESTING",
  REMOVE_VESTING: "REMOVE_VESTING",
};

export const vestingExtensionAclFlags = Object.values(
  vestingExtensionAclFlagsMap
);

export const parseSelectedFlags = (
  allAclFlags,
  selectedFlags,
  moduleName
) => {
  return selectedFlags
    .map((f) => f.toUpperCase())
    .reduce((flags, flag) => {
      if (allAclFlags.includes(flag)) {
        return { ...flags, [flag]: true };
      }
      throw Error(`Invalid ${moduleName} Access Flag: ${flag}`);
    }, {});
};

export const entryERC721 = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    erc721ExtensionAclFlags,
    extensionsIdsMap.ERC721_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryERC1155 = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    erc1155ExtensionAclFlags,
    extensionsIdsMap.ERC1155_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryERC20 = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    erc20ExtensionAclFlags,
    extensionsIdsMap.ERC20_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryBank = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    bankExtensionAclFlags,
    extensionsIdsMap.BANK_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryERC1271 = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    erc1271ExtensionAclFlags,
    extensionsIdsMap.ERC1271_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryExecutor = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    executorExtensionAclFlags,
    extensionsIdsMap.EXECUTOR_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryVesting = (
  contractAddress,
  selectedAcls
) => {
  return getEnabledExtensionFlags(
    vestingExtensionAclFlags,
    extensionsIdsMap.VESTING_EXT,
    contractAddress,
    selectedAcls
  );
};

export const entryDao = (
  contractId,
  contractAddress,
  selectedAcls
) => {
  const flags = daoAccessFlags.flatMap((flag) => {
    return selectedAcls.dao.some((f) => f === flag);
  });

  return {
    id: sha3(contractId),
    addr: contractAddress,
    flags: calculateFlagValue(flags),
  };
};

export const getEnabledExtensionFlags = (
  acls,
  extensionId,
  contractAddress,
  selectedAcls
) => {
  const enabledFlags = acls.flatMap((flag) => {
    const extensionsAcls = selectedAcls.extensions;
    return (
      extensionsAcls &&
      Object.keys(extensionsAcls).length > 0 &&
      extensionsAcls[extensionId].some((f) => f === flag)
    );
  });

  return {
    id: sha3(extensionId),
    addr: contractAddress,
    flags: calculateFlagValue(enabledFlags),
  };
};

export const calculateFlagValue = (values) => {
  return values
    .map((v, idx) => (v === true ? 2 ** idx : 0))
    .reduce((a, b) => a + b);
};
