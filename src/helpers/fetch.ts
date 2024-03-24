import * as multisig from '@sqds/multisig';
import { Connection, clusterApiUrl, PublicKey, Cluster } from '@solana/web3.js';

export async function fetchMultisigAccount(multisigBs58: string, RPC: Cluster) {
  try {
    const multisigPda = new PublicKey(multisigBs58);

    const connection = new Connection(clusterApiUrl(RPC), 'confirmed');

    const multisigAccount =
      await multisig.accounts.accountProviders.Multisig.fromAccountAddress(
        connection,
        multisigPda,
      );

    // Log out the multisig's members
    console.log(multisigAccount);

    return multisigAccount;
  } catch (error) {
    console.error('Error fetching multisig account:', error);
  }
}

// Call the async function to fetch the multisig account
fetchMultisigAccount('8z3LjavuUzoJoSb1NyKwJWCupFcpKgjBhHk6wgCjSRdg', 'devnet');
