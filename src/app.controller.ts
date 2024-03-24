import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

interface BankingInfo {
  account_name: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

export interface MerchantData {
  email: string;
  bankInfo: BankingInfo;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('register')
  register(@Body() body: { email: string; bankInfo: BankingInfo }): any {
    const { email, bankInfo } = body;

    const data: MerchantData = { email, bankInfo };
    return this.appService.register(data);
  }

  @Post('ms')
  create(): any {
    return this.appService.createMultisig();
  }

  @Post('off-ramp')
  offRamp(): any {}

  @Get('generateNewVault')
  generateNewVault(): any {
    return this.appService.generateNewVault();
  }

  @Post('txn')
  transfers(@Body() body: any): any {
    //receiver
    console.log(body[0].tokenTransfers[0].toUserAccount);
    const receiver = body[0].tokenTransfers[0].toUserAccount;

    //amount
    console.log(body[0].tokenTransfers[0].tokenAmount);
    const amount = body[0].tokenTransfers[0].tokenAmount;

    //mint
    console.log(body[0].tokenTransfers[0].mint);
    const mint = body[0].tokenTransfers[0].mint;

    if (mint === '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU') {
      return this.appService.transferToscalex(receiver, amount);
    }
  }
}
