import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get live executive dashboard metrics and recent activities (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
  })
  async getDashboardSummary() {
    return this.dashboardService.getDashboardSummary();
  }
}
