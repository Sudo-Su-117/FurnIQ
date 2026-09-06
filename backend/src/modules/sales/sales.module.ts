import { Module } from '@nestjs/common';
import { SalesOrdersService } from './services/sales-orders.service';
import { CustomerInvoicesService } from './services/customer-invoices.service';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { CustomerInvoicesController } from './controllers/customer-invoices.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [SalesOrdersController, CustomerInvoicesController],
  providers: [SalesOrdersService, CustomerInvoicesService],
  exports: [SalesOrdersService, CustomerInvoicesService],
})
export class SalesModule {}
