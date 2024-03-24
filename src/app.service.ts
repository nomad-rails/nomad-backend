import { Injectable } from '@nestjs/common';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  createClient,
  SupabaseClient,
  PostgrestError,
} from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import * as multisig from '@sqds/multisig';
import * as bs58 from 'bs58';
import { HttpService } from '@nestjs/axios';
const { Permissions } = multisig.types;

interface BankingInfo {
  account_name: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

interface AccountInfo {
  account_number: string;
  bank_code: string;
}

export interface MerchantData {
  email: string;
  bankInfo: BankingInfo;
}

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async createMultisig(): Promise<any> {
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

  async getUsersBankingInfo(data): Promise<any> {
    const url = 'https://ramp.scalex.africa/business/bank/resolve';
    console.log(data);
    const bearerToken =
      'test.sc.ey65f1a83706b7b6cfe0fb766965f1a83706b7b6cfe0fb766a65f1a83706b7b6cfe0fb766b';

    try {
      const response = await this.httpService
        .post(url, data, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        })
        .toPromise();

      console.log(response);
      return response;
    } catch (error) {
      // Handle errors here
      console.error('Error:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  connect(): SupabaseClient {
    const url = this.configService.get('URL');
    const key = this.configService.get('ANON_KEY');

    const database = createClient(url, key);

    return database;
  }

  async getNextUserId(): Promise<number | PostgrestError> {
    const db = this.connect();

    const { data, error } = await db.from('nomad_merchants').select('*');

    if (data) {
      return data.length + 1;
    } else if (error) {
      return error;
    }
  }

  getVault(id: number): PublicKey {
    //retrieve merchant id as index
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: new PublicKey(
        '8z3LjavuUzoJoSb1NyKwJWCupFcpKgjBhHk6wgCjSRdg',
      ),
      index: id,
    });
    return vaultPda;
  }

  async generateNewVault(): Promise<string> {
    const id = await this.getNextUserId();

    const nomadVault = this.getVault(id as unknown as number).toBase58();
    return nomadVault;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async register(data: MerchantData): Promise<boolean> {
    // brings email and bank acount. Stores email-key, bank account
    //creates pda
    const db = this.connect();

    const id = (await this.getNextUserId()) as unknown as number;

    //store vaultpda
    const vaultPda = this.getVault(id).toBase58();

    if (data) {
      const { error } = await db
        .from('nomad_merchants')
        .insert({
          email: data.email,
          bankInfo: data.bankInfo,
          vaultPda: vaultPda,
        })
        .select();

      if (error !== null) {
        console.warn(error);
        return false;
      } else {
        //create Webhook
        return true;
      }
    }
    //return this.getVault(id);
  }

  retrieve(): any {}

  async makePostRequest(
    accountInfo: AccountInfo,
    amount: number,
  ): Promise<any> {
    const url = 'https://ramp.scalex.africa/business/tx/offramp';
    const bearerToken =
      'test.sc.ey65f1a83706b7b6cfe0fb766965f1a83706b7b6cfe0fb766a65f1a83706b7b6cfe0fb766b';

    console.log(accountInfo, amount);
    const postData = {
      amount: amount,
      coin_type: 'USDC_SOLANA',
      recipient_bank_info: accountInfo,
      recipient: {
        name: 'Scalex Africa',
        country: 'NG',
        address: 'cooplag',
        dob: '01/01/2000',
        email: 'joel@scalex.africa',
        idNumber: '273409234234',
        idType: 'nin',
        phone: '+2347018181202',
      },
    };

    try {
      const response = await this.httpService
        .post(url, postData, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        })
        .toPromise()
        .then();

      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error:', error.data);
      throw error;
    }
  }

  async transferToscalex(receiver: string, amount: number): Promise<any[]> {
    // receives webhooks from helius;
    console.log(amount);
    // searches receiver Pubkey reference to a bank account INFO
    const db = this.connect();

    const { data: findUserDetails, error } = await db
      .from('nomad_merchants')
      .select('*')
      .eq('vaultPda', receiver);

    console.log(findUserDetails[0].bankInfo, error);

    if (findUserDetails !== null) {
      const data = {
        account_number: findUserDetails[0].bankInfo.account_number,
        bank_code: findUserDetails[0].bankInfo.bank_code,
      };
      if (data) {
        await this.makePostRequest(data, 5);
      }
    }

    return findUserDetails;
    // posts an off-ramp request to scalex
    // transfers from the users vault to scalex reference account
    // returns done
  }
}
