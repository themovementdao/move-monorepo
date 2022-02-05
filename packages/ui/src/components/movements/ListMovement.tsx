import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { hexToAscii } from "web3-utils";
import { StoreState } from "../../store/types";
import Wrap from "../common/Wrap";
import LoaderLarge from "../feedback/LoaderLarge";
import { useWeb3Modal } from "../web3/hooks";
import MovementCard from "./MovementCard";

interface Movement {
    factoryAddress: string;
    name: string;
    movementAddress: string;
}


function decodeAbiString(arr: string[]): { factoryAddress: string, name: string, movementAddress: string }[] {
    return arr.map(str => {
        const sb = str.substr(2);
        const name = `0x${sb.substring(40, sb.length - 40)}`;
        const factoryAddress = `0x${sb.substr(0, 40)}`;
        const movementAddress = `0x${sb.substr(40 + name.length - 2, 40)}`;
        return {
            factoryAddress,
            movementAddress,
            name: hexToAscii(name)
        };
    })
    
}

export default function ListMovement(): JSX.Element {
    const { account } = useWeb3Modal();

    const [isLoading, setIsLoading] = useState(true);
    const [movemets, setMovements] = useState<Movement[]>([]);
    const DaoRegistryContract = useSelector(
        (state: StoreState) => state.contracts?.DaoRegistryContract
    );

    useEffect(() => {
        const getActiveMovements = async () => {
            const getMovements: any = DaoRegistryContract?.instance.methods.getMovements();
            if (getMovements) {
                const response: any = await getMovements.call();
                console.log(response);
                setMovements(movemets.concat(...decodeAbiString(response)));               
                setIsLoading(false);    
            }
        };
        getActiveMovements();
    }, [DaoRegistryContract, account])
    return (
        <>
            <Wrap className="section-wrapper">
                <h3>Createad Movemets</h3>
                { isLoading ? 
                (<div className="loader--large-container">
                    <LoaderLarge />
                </div>) : ( <div className="grid--fluid grid-container">
                    <>
                    { movemets?.length === 0 || !movemets 
                                ? ( <p className="text-center">No active movement, yet!</p> ) 
                                : (
                                    <div className="grid__cards">
                                        {movemets?.map(movemet => (<MovementCard  key={movemet.factoryAddress} movement={movemet}></MovementCard>))}
                                    </div>
                                )
                    }
                    </>
                </div>
                )}
            </Wrap>
        </>
      );
}