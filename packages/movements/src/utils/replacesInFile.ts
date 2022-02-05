import { replaceInFile, ReplaceInFileConfig } from 'replace-in-file';

export async function replaceSubgraphYaml (options: {
    files: string | string[];
    daoFactoryAddress: string;
    blockNumber: number;
    network: string;
}) {
    const { files, daoFactoryAddress, blockNumber, network } = options;
    const optionsReplace: ReplaceInFileConfig = {
      files,
      from: [
        /address: "([a-zA-Z0-9]*)"/gm,
        /network: ([a-zA-Z]*)/gm,
        /startBlock: ([0-9]*)/gm
      ],
      to: (match: string) => {
        const newMatch = match.split(':');
        if (newMatch[0] === 'address') {
          newMatch[1] = ` "${daoFactoryAddress}"`;
        }
        if (newMatch[0] === 'startBlock') {
          newMatch[1] = ` ${blockNumber}`;
        }
        if (newMatch[0] === 'newtwok') {
          newMatch[1] = ` ${network}`;
        }
        return newMatch.join(':');
      }
    };
    const result = await replaceInFile(optionsReplace);
    return result;
}

export async function replaceEnvVars(options: { 
    files: string | string[];
    regExp: RegExp | RegExp[] | string[] | string;
    key: string;
    value: string;
}) {
    const { files, regExp, key, value } = options;
    const optionsReplace: ReplaceInFileConfig = {
        files: files,
        from: regExp,
        to: (match: string) => {
          const newMatch = match
            .split(':"')
            .map((item: string) => {
                if (item !== key) {
                    return `"${value}"`;
                }
                return item;
            })
            .join(':');
          return newMatch;
        }
      };
    const result = await replaceInFile(optionsReplace);
    return result;
}