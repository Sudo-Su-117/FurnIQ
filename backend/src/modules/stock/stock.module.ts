import { Module } from '@nestjs/common';
import { StockService } from './services/stock.service';
import { StockController } from './controllers/stock.controller';

@Module({
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
