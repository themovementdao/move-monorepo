import path from 'path';
import { spawn } from 'child_process';

const exec = (cmd: string, args: string[]) => {
    const srcDir = path.join(__dirname, '../..', 'subgraph');
    try {
      return spawn(cmd, args , { cwd: srcDir, shell: true });
    } catch (e: any) {      
      throw new Error(`Failed to run command \`${cmd}\``);
    }
};

export function graphBuild() {
    return exec('graph', ['build']);
}

export function grpahCreate(name: string, node?: string) { 
    return exec('graph', [`create ${name}`, `--node ${node}`]);
}

export function graphDeploy(name: string, node?: string, ipfs?: string, ) {
    return exec('graph', [
        `deploy ${name}`, 
        '--version-label v0.0.1', 
        ipfs ? `--ipfs ${ipfs}` : '', 
        node ? `--node ${node}` : '']
    );
}

export function graphAuth(deploymentKey: string) {
    return exec('graph', [`--studio ${deploymentKey}`]);
}