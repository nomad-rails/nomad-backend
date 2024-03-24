import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import * as bs58 from 'bs58';
const { Permissions } = multisig.types;

async function createMultisig(): Promise<any> {
  // Cluster Connection
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  const createKey = Keypair.generate();

  const key = bs58.decode(
    '43xQCVeSAFPtDjEwyTQCirhDfybneT9p4A8HBzX3VBUonkqwi9VPUkgiS1ViZLDbhYBRRrmS6byt1EtoBMcnBESu',
  );

  const creator = Keypair.fromSecretKey(key);

  // Derive the multisig PDA
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  try {
    const signature = await multisig.rpc.multisigCreate({
      connection,
      // One-time random Key
      createKey,
      // The creator & fee payer
      creator,
      // The PDA of the multisig you are creating, derived by a random PublicKey
      multisigPda,
      // Here the config authority will be the system program
      configAuthority: creator.publicKey,
      // Create without any time-lock
      threshold: 1,
      // List of the members to add to the multisig
      members: [
        {
          // Members Public Key
          key: creator.publicKey,
          // Members permissions inside the multisig
          permissions: Permissions.all(),
        },
      ],
      // This means that there need to be 2 votes for a transaction proposal to be approved
      timeLock: 0,
    });

    return {
      multisig: multisigPda.toBase58(),
      signature: signature,
    };
  } catch (error) {
    console.error('Error creating multisig:', error);
  }
}

createMultisig().then((res) => console.log(res));
