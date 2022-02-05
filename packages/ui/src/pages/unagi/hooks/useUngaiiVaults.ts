import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useWeb3Modal } from "../../../components/web3/hooks";
import { StoreState } from "../../../store/types";

const ERC20Interface = (web3Instance: any, token: string, account: string) => {
  return new web3Instance.eth.Contract([
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ], token, { from: account });
};

const balanceOf = async (erc20Interface: any, address: string, web3Instance: any) => {  
  const balance = await erc20Interface.methods.balanceOf(address).call();
  return Math.round(+web3Instance.utils.fromWei(balance, 'ether'));
};


export function useUnagiiVaults() {
    const UNAGII_DAI_VAULT_ADDRESS = "0x9ce3018375d305CE3C3303A26eF62D3d2EB8561A";
    let tokenERC20: any;
    let uTokenERC20: any;

    const [token, setToken] = useState("");
    const [uToken, setUtoken] = useState("");
    const [balance, setBalance] = useState(0);
    const [weth, setWeth] = useState("");

    const { account, web3Instance } = useWeb3Modal();

    const bankExtension = useSelector(
      (state: StoreState) => state.contracts?.BankExtensionContract
    );

    const bankAdress: string = bankExtension?.contractAddress || '';

    if (!web3Instance) {
        throw new Error("Not web3");
    }

    const IUnagiiVault = new web3Instance.eth.Contract([
      {
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "uToken",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ], UNAGII_DAI_VAULT_ADDRESS, { from: account });

    const UniswapRouterV2 = new web3Instance.eth.Contract([
      {
        "inputs": [],
        "name": "WETH",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "pure",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "amountOutMin",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "path",
            "type": "address[]"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          }
        ],
        "name": "swapExactETHForTokens",
        "outputs": [
          {
            "internalType": "uint256[]",
            "name": "amounts",
            "type": "uint256[]"
          }
        ],
        "stateMutability": "payable",
        "type": "function"
      }
    ], "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", { from: account });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      const fetchTokens = async () => {
        setToken(await IUnagiiVault.methods.token().call());
        setUtoken(await IUnagiiVault.methods.uToken().call());
        setWeth(await UniswapRouterV2.methods.WETH().call());
      };
      fetchTokens();
    });

    if (account && token) {
      tokenERC20 = ERC20Interface(web3Instance, token, account); 
    }
     
    if (account && uToken) {
      uTokenERC20 = ERC20Interface(web3Instance, token, account); 
    }

    const uTokenBalance = async (address: string): Promise<number> => {
      if (!uToken) {
        const t = await IUnagiiVault.methods.uToken().call();
        uTokenERC20 = ERC20Interface(web3Instance, t, account || ''); 
      }
      setBalance(await balanceOf(uTokenERC20, address, web3Instance));
      return balance;
    }

    const tokenBalance = async (address: string): Promise<number> => {
      if (!token) {
        const t = await IUnagiiVault.methods.token().call();
        tokenERC20 = ERC20Interface(web3Instance, t, account || ''); 
      }
      setBalance(await balanceOf(tokenERC20, address, web3Instance));
      return balance;
    }

    const swapExactETHForTokens = (amount: string) => {
      return UniswapRouterV2.methods.swapExactETHForTokens(
        web3Instance.utils.toBN("1"),
        [weth, token],
        bankAdress,
        web3Instance.utils.toBN("1650370580")
      ).send({ 
        from: account,  
        value: web3Instance.utils.toBN(web3Instance.utils.toWei(amount,"ether")),
        gasPrice: web3Instance.utils.toBN("0")
      });
    };
    
    return { 
      UNAGII_DAI_VAULT_ADDRESS,
      account,
      web3Instance,
      uTokenBalance,
      tokenBalance,
      swapExactETHForTokens,
    };
}