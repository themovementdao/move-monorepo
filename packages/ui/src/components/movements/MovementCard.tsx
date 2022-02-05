type MovementCardProps = {
   movement: { factoryAddress: string; name: string; movementAddress: string; }
}
function generateLink(name: string) {
    const newName = name.replace(" ", "-").toLowerCase();
    return `https://${newName}.ted-dao.xyz`;
}

export default function MovementCard(props: MovementCardProps): JSX.Element  {  
    const link = generateLink(props.movement.name);
    return (
        <a className="proposalcard__link" href={link} target="_blank" rel="noreferrer">
            <div className="proposalcard">
                <h3 className="proposalcard__title">{ props.movement.name }</h3>
                <p><small>FactoryAddress: {props.movement.factoryAddress}</small></p>
                <p><small>MovementAddress: {props.movement.movementAddress}</small></p>
            </div>
        </a>
    );
}