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
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductsDto } from '../dto/query-products.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product (Goods / Service / Combo)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filters (category, type, search) and pagination (Public)' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update product details' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete a product permanently' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
