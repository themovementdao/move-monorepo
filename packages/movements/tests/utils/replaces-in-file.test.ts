import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { replaceSubgraphYaml, replaceEnvVars } from '../../src/utils/replacesInFile';

describe('replace-in-file-utils', () => {

    const fakeFileSubgraph = './tests/utils/subgraph.test.yml';

    const fakeFileEnvVars = './tests/utils/envVarsTest.js';

    beforeEach(() => {
        writeFileSync(fakeFileSubgraph, `address: "0x43d366a803b59b12834c92cd2ef00525ad0546c5" abi: DaoFactory startBlock: 0`);
        writeFileSync(fakeFileEnvVars, `REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS:"0x43d366a803b59b12834c92cd2ef00525ad0546c5", REACT_APP_GRAPH_API_URL:"http://127.0.0.1:8000/subgraphs/name/openlawteam/test-ted"`);
    });

    afterEach(() => {
        unlinkSync(fakeFileSubgraph);
        unlinkSync(fakeFileEnvVars);
    });

    it('should be replace in subgraph yml file', async () => {
        const fakeAddress = "0x00000000000000000000000000000";
        const fakeBlockNumber = 1;

        const result = await replaceSubgraphYaml({
            files: fakeFileSubgraph,
            daoFactoryAddress: fakeAddress,
            blockNumber: fakeBlockNumber
        });

        const fakeFile = readFileSync(fakeFileSubgraph); 

        expect(fakeFile.toString().trim()).toBe(`address: "${fakeAddress}" abi: DaoFactory startBlock: ${fakeBlockNumber}`);

        expect(result[0].hasChanged).toBe(true);
    });

    it('should be replace daoRegistry in js file', async () => {
        const fakeAddress = "0x00000000000000000000000000000";

        const result = await replaceEnvVars({
            files: fakeFileEnvVars,
            regExp: /REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS:"([a-zA-Z0-9]*)"/gm,
            key: "REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS",
            value: fakeAddress
        }); 

        const fakeFile = readFileSync(fakeFileEnvVars); 
        expect(fakeFile.toString().trim()).toBe(`REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS:"${fakeAddress}", REACT_APP_GRAPH_API_URL:"http://127.0.0.1:8000/subgraphs/name/openlawteam/test-ted"`);
        expect(result[0].hasChanged).toBe(true);
    });

    it('should be replace subgraphUrl in js file', async () => {
        const fakeName = "fake-name";

        const result = await replaceEnvVars({
            files: fakeFileEnvVars,
            regExp: /REACT_APP_GRAPH_API_URL:"(https|http):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])"/gm,
            key: "REACT_APP_GRAPH_API_URL",
            value: `http://127.0.0.1:8000/subgraphs/name/openlawteam/${fakeName}`
        }); 

        const fakeFile = readFileSync(fakeFileEnvVars); 
        expect(fakeFile.toString().trim()).toBe(`REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS:"0x43d366a803b59b12834c92cd2ef00525ad0546c5", REACT_APP_GRAPH_API_URL:"http://127.0.0.1:8000/subgraphs/name/openlawteam/${fakeName}"`);
        expect(result[0].hasChanged).toBe(true);
    });

})