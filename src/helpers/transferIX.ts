import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from '@solana/spl-token';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  ParsedAccountData,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import * as bs58 from 'bs58';

const DEMO_WALLET_SECRET_KEY = bs58.decode(
  '43xQCVeSAFPtDjEwyTQCirhDfybneT9p4A8HBzX3VBUonkqwi9VPUkgiS1ViZLDbhYBRRrmS6byt1EtoBMcnBESu',
);

const FROM_KEYPAIR = Keypair.fromSecretKey(DEMO_WALLET_SECRET_KEY);

export async function getSplTx(AUTHORITY: Keypair): Promise<Transaction> {
  const connection = new Connection(clusterApiUrl('devnet'));

  const DESTINATION_WALLET = 'DemoKMZWkk483hX4mUrcJoo3zVvsKhm8XXs28TuwZw9H';
  const MINT_ADDRESS = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; //You must change this value!
  const TRANSFER_AMOUNT = 0.2;

  async function getNumberDecimals(): Promise<number> {
    const info = await connection.getParsedAccountInfo(
      new PublicKey(MINT_ADDRESS),
    );
    const result = (info.value?.data as ParsedAccountData).parsed.info
      .decimals as number;
    return result;
  }

  const sourceAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    AUTHORITY,
    new PublicKey(MINT_ADDRESS),
    AUTHORITY.publicKey,
  );

  const destinationAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    AUTHORITY,
    new PublicKey(MINT_ADDRESS),
    new PublicKey(DESTINATION_WALLET),
  );

  const numberDecimals = await getNumberDecimals();

  const tx = new Transaction();
  tx.add(
    createTransferInstruction(
      sourceAccount.address,
      destinationAccount.address,
      AUTHORITY.publicKey,
      TRANSFER_AMOUNT * Math.pow(10, numberDecimals),
    ),
  );

  console.log(tx);
  return tx;
}

(async () => {
  await getSplTx(FROM_KEYPAIR);
})();
