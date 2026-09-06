import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from '../services/stock.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Stock')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get warehouse inventory stock levels and valuation (Public)' })
  @ApiResponse({ status: 200, description: 'Stock list retrieved successfully' })
  async getStockList() {
    return this.stockService.getStockList();
  }

  @Public()
  @Get('summary')
  @ApiOperation({ summary: 'Get high-level inventory KPI summary (Public)' })
  @ApiResponse({ status: 200, description: 'Stock summary retrieved successfully' })
  async getStockSummary() {
    return this.stockService.getStockSummary();
  }
}
