import { Module } from '@nestjs/common';
import { PaymentsService } from './services/payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
