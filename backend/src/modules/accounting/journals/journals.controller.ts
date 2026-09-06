import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { JournalType } from '@prisma/client';

@ApiTags('Chart of Accounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/accounting/journals')
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all accounting journals (Public)' })
  @ApiQuery({ name: 'type', enum: JournalType, required: false })
  @ApiResponse({ status: 200, description: 'Journals retrieved successfully' })
  async findAll(@Query('type') type?: JournalType) {
    return this.journalsService.findAll(type);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get journal details and recent entries by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Journal retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.journalsService.findById(id);
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new accounting journal (Public)' })
  @ApiResponse({ status: 201, description: 'Journal created successfully' })
  async create(@Body() body: any) {
    return this.journalsService.create(body);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Update an accounting journal (Public)' })
  @ApiResponse({ status: 200, description: 'Journal updated successfully' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.journalsService.update(id, body);
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an accounting journal (Public)' })
  @ApiResponse({ status: 200, description: 'Journal deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.journalsService.remove(id);
  }
}
