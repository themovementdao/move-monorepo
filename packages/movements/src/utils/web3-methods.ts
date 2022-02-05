import Web3 from "web3";
import { hexToAscii } from 'web3-utils';

function decodeAbiString (array: string[]): { factoryAddress: string, name: string, movementAddress: string }[] {
    return array.map(str => {
      const sb = str.substr(2);
      const name = `0x${sb.substring(40, sb.length - 40)}`;
      const factoryAddress = `0x${sb.substr(0, 40)}`;
      const movementAddress = `0x${sb.substr(40 + name.length - 2, 40)}`;
      return {
        factoryAddress,
        movementAddress,
        name: hexToAscii(name).replace(' ', '-').toLowerCase()
      };
    });
}

export default (providerUrl: string) => {
    const web3Intance = new Web3(new Web3.providers.WebsocketProvider(providerUrl));
    return {
        web3Intance,
        createContract: (abi: any, address: string) => {
            return new web3Intance.eth.Contract(abi, address)
        },
        decodeAbiString
    }
};