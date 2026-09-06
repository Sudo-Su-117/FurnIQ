import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from '../services/contacts.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { QueryContactsDto } from '../dto/query-contacts.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Contact (Customer / Vendor)' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  async create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List contacts with filters and pagination (Public)' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async findAll(@Query() query: QueryContactsDto) {
    return this.contactsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get contact details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.contactsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update contact details' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete a contact permanently' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.contactsService.delete(id);
  }

  @Patch(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Archive a contact' })
  @ApiResponse({ status: 200, description: 'Contact archived successfully' })
  async archive(@Param('id') id: string) {
    return this.contactsService.archive(id);
  }
}
