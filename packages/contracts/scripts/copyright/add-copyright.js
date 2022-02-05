const fs = require('fs');
const path = require('path');
const glob = require('glob');

const skipFilesContracts = [
    '../contracts/guards/MemberGuard.sol',
    '../contracts/extensions/bank/Bank.sol',
    '../contracts/extensions/token/erc20/ERC20TokenExtension.sol',
    '../contracts/extensions/token/erc20/ERC20TokenExtensionFactory.sol',
    '../contracts/core/DaoConstants.sol',
    '../contracts/core/DaoFactory.sol',
    '../contracts/core/DaoRegistry.sol',
    '../contracts/adapters/voting/OffchainVoting.sol',
    '../contracts/adapters/voting/Voting.sol',
];

const skipFilesBuild = [
    '../build/sources/utils/DaoArtifacts.sol',
    '../build/sources/utils/PotentialNewMember.sol',
    '../build/sources/utils/Signatures.sol',
    '../build/sources/test/ERC20Minter.sol',
    '../build/sources/test/ERC1155TestToken.sol',
    '../build/sources/test/OLToken.sol',
    '../build/sources/test/PixelNFT.sol',
    '../build/sources/test/ProxToken.sol',
    '../build/sources/test/TestFairShareCalc.sol',
    '../build/sources/test/TestToken1.sol',
    '../build/sources/test/TestToken2.sol',
    '../build/sources/helpers/DaoHelper.sol',
    '../build/sources/helpers/FairShareHelper.sol',
    '../build/sources/helpers/GuildKickHelper.sol',
    '../build/sources/guards/AdapterGuard.sol',
    '../build/sources/guards/MemberGuard.sol',
    '../build/sources/extensions/bank/Bank.sol',
    '../build/sources/extensions/erc1155/ERC1155TokenExtension.sol',
    '../build/sources/extensions/erc1155/ERC1155TokenExtensionFactory.sol',
    '../build/sources/extensions/erc1271/ERC1271.sol',
    '../build/sources/extensions/erc1271/ERC1271ExtensionFactory.sol',
    '../build/sources/extensions/executor/Executor.sol',
    '../build/sources/extensions/executor/ExecutorFactory.sol',
    '../build/sources/extensions/core/CloneFactory.sol',
    '../build/sources/extensions/core/DaoConstants.sol',
    '../build/sources/extensions/core/DaoFactory.sol',
    '../build/sources/extensions/core/DaoRegistry.sol',
    '../build/sources/extensions/adapters/BankAdapter.sol',
    '../build/sources/extensions/adapters/Configuration.sol',
    '../build/sources/extensions/adapters/CouponOnboarding.sol',
    '../build/sources/extensions/adapters/DaoRegistryAdapter.sol',
    '../build/sources/extensions/adapters/Distribute.sol',
    '../build/sources/extensions/adapters/ERC1155Adapter.sol',
    '../build/sources/extensions/adapters/Financing.sol',
    '../build/sources/extensions/adapters/GuildKick.sol',
    '../build/sources/extensions/adapters/Managing.sol',
    '../build/sources/extensions/adapters/NFTAdapter.sol',
    '../build/sources/extensions/adapters/Onboarding.sol',
    '../build/sources/extensions/adapters/Ragequit.sol',
    '../build/sources/extensions/adapters/Signatures.sol',
    '../build/sources/extensions/adapters/Tribute.sol',
    '../build/sources/extensions/adapters/TributeNFT.sol',
    '../build/sources/extensions/voting/BatchVoting.sol',
    '../build/sources/extensions/voting/KickBadReporterAdapter.sol',
    '../build/sources/extensions/voting/OffchainVoting.sol',
    '../build/sources/extensions/voting/OffchainVotingHash.sol',
    '../build/sources/extensions/voting/SnapshotProposalContract.sol',
    '../build/sources/extensions/voting/Voting.sol',
    '../build/sources/extensions/interfaces/IConfiguration.sol',
    '../build/sources/extensions/interfaces/IDistribute.sol',
    '../build/sources/extensions/interfaces/IFinancing.sol',
    '../build/sources/extensions/interfaces/IGuildKick.sol',
    '../build/sources/extensions/interfaces/IManaging.sol',
    '../build/sources/extensions/interfaces/IOnboarding.sol',
    '../build/sources/extensions/interfaces/IRagequit.sol',
    '../build/sources/extensions/interfaces/ISignatures.sol',
    '../build/sources/extensions/interfaces/IVoting.sol',
];

const copyright = fs.readFileSync(path.resolve(__dirname, 'copyright.txt'), 'utf8');

const replaceCopyright = (content, copyright, pragmaStrings) => {
  const lastIndex = content.indexOf('*/');
  content.splice(0, lastIndex+1);
  return pragmaStrings.concat([copyright]).concat(content).join('\n');
};

const getDirectories = function (src, callback) {
  glob(`${src}/**/*.sol`, callback);
};

const getFileContents = (path) => {
  const data = fs.readFileSync(path).toString().split('\n');
  const pragmaImportIndex = data.indexOf(data.filter(s => s.includes('pragma')).at(-1));
  const pragmaStrings = data.slice(0, pragmaImportIndex+1);
  // If file already contains copyright message - replace it with the new one
  if (data[pragmaImportIndex+1].includes('/*')) {
      return replaceCopyright(data, copyright, pragmaStrings);
  }
  data.splice(0, pragmaImportIndex+1)
  return pragmaStrings.concat([copyright]).concat(data).join('\n');
};

getDirectories(
  path.resolve(__dirname, '../../build/sources'),
  function (err, data) {
      const filtered = data.filter((item) => !skipFilesBuild.includes(item));
      filtered.forEach((path) => {
          const newData = getFileContents(path);
          fs.writeFile(path, newData, function (err) {
              if (err) return console.log(err);
          });
      });
  }
);

getDirectories(
  path.resolve(__dirname, '../../contracts'),
  function (err, data) {
      const filtered = data.filter(
          (item) => !skipFilesContracts.includes(item)
      );
      filtered.forEach((path) => {
          const newData = getFileContents(path);
          fs.writeFile(path, newData, function (err) {
              if (err) return console.log(err);
          });
      });
  }
);
