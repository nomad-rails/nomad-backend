import {
  Connection,
  PublicKey,
  TransactionMessage,
  Keypair,
  clusterApiUrl,
  Cluster,
  ParsedAccountData,
} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import * as multisig from '@sqds/multisig';
import * as bs58 from 'bs58';

export async function transferSPL(
  RPC: Cluster,
  memberOne: Keypair,
  destinationAccount: PublicKey,
  multisigPubkey: PublicKey,
  mintAddress: PublicKey, // Address of the SPL token
  amount: number, // Amount should include decimals
) {
  try {
    const connection = new Connection(clusterApiUrl(RPC), 'confirmed');

    const multisigAccount =
      await multisig.accounts.accountProviders.Multisig.fromAccountAddress(
        connection,
        multisigPubkey,
      );

    const payer = memberOne;

    const [vaultPda] = multisig.getVaultPda({
      multisigPda: multisigPubkey,
      index: 0,
    });

    console.log('Vault: ' + vaultPda.toBase58());

    const transactionIndex = 2n;
    // multisig.utils.toBigInt(multisigAccount.transactionIndex) + 1n;

    const [transactionPda] = multisig.getTransactionPda({
      multisigPda: multisigPubkey,
      index: transactionIndex,
    });

    console.log(transactionPda);

    const allowOffcurve = true;
    // Get or create associated token accounts
    const vaultSPLAccount = await splToken.getOrCreateAssociatedTokenAccount(
      connection,
      payer, // Payer for potential account creation
      mintAddress,
      vaultPda,
      allowOffcurve,
    );

    console.log(vaultSPLAccount);

    const destinationSPLAccount =
      await splToken.getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        destinationAccount,
      );

    async function getNumberDecimals(): Promise<number> {
      const info = await connection.getParsedAccountInfo(
        new PublicKey(mintAddress),
      );
      const result = (info.value?.data as ParsedAccountData).parsed.info
        .decimals as number;
      return result;
    }

    // Fetch the number of decimals
    const decimals = await getNumberDecimals();

    // Construct the transfer instruction
    const transferInstruction = splToken.createTransferInstruction(
      vaultSPLAccount.address,
      destinationSPLAccount.address,
      vaultPda, // Authority
      amount * Math.pow(10, decimals), // Adjust amount based on decimals
    );

    console.log('txIX: ' + transferInstruction);

    // const testTransferMessage = new TransactionMessage({
    //   payerKey: vaultPda,
    //   recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    //   instructions: [transferInstruction],
    // });

    // let signature = await multisig.rpc.vaultTransactionCreate({
    //   connection,
    //   feePayer: payer, // Use the first signer as the fee payer
    //   multisigPda: multisigPubkey,
    //   transactionIndex,
    //   creator: memberOne.publicKey,
    //   vaultIndex: 0,
    //   ephemeralSigners: 0, // Replace with the actual number of ephemeral signers
    //   transactionMessage: testTransferMessage,
    // });

    // await connection.confirmTransaction(signature);

    // console.log('Vault Tx Create: ' + signature);

    // signature = await multisig.rpc.proposalCreate({
    //   connection,
    //   feePayer: payer,
    //   multisigPda: multisigPubkey,
    //   transactionIndex,
    //   creator: memberOne,
    //   isDraft: true,
    // });

    // await connection.confirmTransaction(signature);

    // console.log('Propsal Create: ' + signature);

    // const [proposalPda] = multisig.getProposalPda({
    //   multisigPda: multisigPubkey,
    //   transactionIndex,
    // });

    // console.log(proposalPda);

    // signature = await multisig.rpc.proposalActivate({
    //   connection,
    //   feePayer: payer,
    //   multisigPda: multisigPubkey,
    //   member: memberOne,
    //   transactionIndex,
    // });

    // await connection.confirmTransaction(signature);

    // console.log('Propsal Activate: ' + signature);

    // signature = await multisig.rpc.proposalApprove({
    //   connection,
    //   feePayer: payer,
    //   multisigPda: multisigPubkey,
    //   member: memberOne,
    //   transactionIndex,
    //   memo: 'First transaction',
    // });

    // console.log('Propsal Approve: ' + signature);
    // ... (rest of your multisig transaction creation, proposal, approval, and execution logic)

    const signature = await multisig.rpc.vaultTransactionExecute({
      connection,
      feePayer: payer,
      multisigPda: multisigPubkey,
      transactionIndex,
      member: payer.publicKey,
    });

    console.log(signature);
    await connection.confirmTransaction(signature);
    console.log('execute: ' + signature);
  } catch (error) {
    console.error('Error:', error);
  }
}

const wallet = bs58.decode(
  '43xQCVeSAFPtDjEwyTQCirhDfybneT9p4A8HBzX3VBUonkqwi9VPUkgiS1ViZLDbhYBRRrmS6byt1EtoBMcnBESu',
);
const authority = Keypair.fromSecretKey(wallet);
const destinationAccount = new PublicKey(
  '9Xkt75L6YLmfVyNXQyBzM2Cd8PUW6pmUZSk3oyG57cjJ',
);
const mintAddress = new PublicKey(
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
);
const multisigPubkey = new PublicKey(
  'H6byZJsYLYp4wX2ctr2hhfkxNZcSJUT2SZK27DULp31X',
);

transferSPL(
  'devnet',
  authority,
  destinationAccount,
  multisigPubkey,
  mintAddress,
  0.9,
);
