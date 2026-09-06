import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from '../services/budgets.service';
import { CreateAnalyticAccountDto } from '../dto/create-analytic-account.dto';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Budgets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // ==================== Analytic Accounts ====================

  @Post('analytic-accounts')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an Analytic Account (Income / Expense category)' })
  @ApiResponse({ status: 201, description: 'Analytic account created successfully' })
  async createAnalyticAccount(@Body() dto: CreateAnalyticAccountDto) {
    return this.budgetsService.createAnalyticAccount(dto);
  }

  @Public()
  @Get('analytic-accounts')
  @ApiOperation({ summary: 'List all Analytic Accounts (Public)' })
  @ApiResponse({ status: 200, description: 'Analytic accounts retrieved successfully' })
  async findAllAnalyticAccounts() {
    return this.budgetsService.findAllAnalyticAccounts();
  }

  // ==================== Budgets ====================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Budget for an Analytic Account' })
  @ApiResponse({ status: 201, description: 'Budget created successfully' })
  async createBudget(@Body() dto: CreateBudgetDto) {
    return this.budgetsService.createBudget(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all Budgets with pagination (Public)' })
  @ApiResponse({ status: 200, description: 'Budgets retrieved successfully' })
  async findAllBudgets(@Query() query: PaginationQueryDto) {
    return this.budgetsService.findAllBudgets(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get Budget details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Budget retrieved successfully' })
  async findBudgetById(@Param('id') id: string) {
    return this.budgetsService.findBudgetById(id);
  }
}
