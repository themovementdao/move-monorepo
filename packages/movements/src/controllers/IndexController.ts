import { NextFunction, Request, Response, Router } from 'express';
import path from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { replaceEnvVars } from '../utils/replacesInFile';
import web3Methods from '../utils/web3-methods';

export const IndexController: Router = Router();

IndexController.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nameSubDomain: any = req.query?.name;

    if (!nameSubDomain) {
      res.status(400).send('Please enter subdomain name');
    }

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL not found');
    }

    const { createContract, decodeAbiString } = web3Methods(process.env.PROVIDER_URL);

    if (!process.env.DAO_REGISTRY_ADDRESS) {
      throw new Error('DAO_REGISTRY_ADDRESS not found');
    }

    const DaoRegistry = createContract([{
      inputs: [],
      name: 'getMovements',
      outputs: [
        {
          internalType: 'bytes[]',
          name: 'm',
          type: 'bytes[]'
        }
      ],
      stateMutability: 'view',
      type: 'function'
    }], process.env.DAO_REGISTRY_ADDRESS);

    const rawSubdomains: Buffer = readFileSync(path.join(__dirname, '../..', 'subdomains.json'));
    const subdomains = JSON.parse(rawSubdomains.toString());
    const subdomain = subdomains[nameSubDomain];

    if (subdomain) {
      await replaceEnvVars({
        files: path.join(__dirname, '../..', 'public/static/js/*'),
        regExp: /REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS:"([a-zA-Z0-9]*)"/gm,
        key: "REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS",
        value: subdomain.movementAddress
      });
      await replaceEnvVars({
        files: path.join(__dirname, '../..', 'public/static/js/*'),
        regExp: /REACT_APP_GRAPH_API_URL:"(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])"/gm,
        key: "REACT_APP_GRAPH_API_URL",
        value: "https://api.studio.thegraph.com/query/9237/merkaba-monorepo-test/v0.0.105"
      });
      return res.sendFile(path.join(__dirname, '../..', 'public/index.html'));
    }

    const movementsEncode = await DaoRegistry.methods.getMovements().call();
    const movementsDecode = decodeAbiString(movementsEncode);

    const findMovement = movementsDecode.find(movement => {
      return movement.name === nameSubDomain.toLowerCase();
    });

    if (!findMovement) {
      return res.status(404).send(`<h1> ${nameSubDomain} Not Found</h1>`);
    }

    subdomains[nameSubDomain] = {
      subgraphUrl: null,
      name: findMovement.name,
      movementAddress: findMovement.movementAddress,
      factoryAddress: findMovement.factoryAddress
    }

    const rawWriteData = JSON.stringify(subdomains);

    writeFileSync(path.join(__dirname, '../..', 'subdomains.json'), rawWriteData);
    await replaceEnvVars({
      files: path.join(__dirname, '../..', 'public/static/js/*'),
      regExp: /REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS:"([a-zA-Z0-9]*)"/gm,
      key: "REACT_APP_DAO_REGISTRY_CONTRACT_ADDRESS",
      value: subdomain.movementAddress
    });
    return res.sendFile(path.join(__dirname, '../..', 'public/index.html'));

  } catch (e) {
    next(e);
  }
});
