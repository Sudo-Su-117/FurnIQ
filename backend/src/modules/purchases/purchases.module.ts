import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { VendorBillsService } from './services/vendor-bills.service';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { VendorBillsController } from './controllers/vendor-bills.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [PurchaseOrdersController, VendorBillsController],
  providers: [PurchaseOrdersService, VendorBillsService],
  exports: [PurchaseOrdersService, VendorBillsService],
})
export class PurchasesModule {}
