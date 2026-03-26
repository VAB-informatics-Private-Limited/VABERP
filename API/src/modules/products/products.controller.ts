import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { EnterpriseId, RequirePermission } from '../../common/decorators';
import {
  CreateCategoryDto,
  CreateSubcategoryDto,
  CreateProductDto,
  CreateProductAttributeDto,
} from './dto';

@ApiTags('Products')
@Controller('products')
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ========== Categories ==========

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @RequirePermission('catalog', 'categories', 'view')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAllCategories(
    @EnterpriseId() enterpriseId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAllCategories(enterpriseId, page, limit, search);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @RequirePermission('catalog', 'categories', 'view')
  async findOneCategory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.findOneCategory(id, enterpriseId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  @RequirePermission('catalog', 'categories', 'create')
  async createCategory(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateCategoryDto,
  ) {
    return this.productsService.createCategory(enterpriseId, createDto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @RequirePermission('catalog', 'categories', 'edit')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateCategoryDto>,
  ) {
    return this.productsService.updateCategory(id, enterpriseId, updateDto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  @RequirePermission('catalog', 'categories', 'delete')
  async deleteCategory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.deleteCategory(id, enterpriseId);
  }

  // ========== Subcategories ==========

  @Get('subcategories')
  @ApiOperation({ summary: 'Get all subcategories' })
  @RequirePermission('catalog', 'subcategories', 'view')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAllSubcategories(
    @EnterpriseId() enterpriseId: number,
    @Query('categoryId') categoryId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAllSubcategories(enterpriseId, categoryId, page, limit, search);
  }

  @Get('subcategories/:id')
  @ApiOperation({ summary: 'Get subcategory by ID' })
  @RequirePermission('catalog', 'subcategories', 'view')
  async findOneSubcategory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.findOneSubcategory(id, enterpriseId);
  }

  @Post('subcategories')
  @ApiOperation({ summary: 'Create a new subcategory' })
  @RequirePermission('catalog', 'subcategories', 'create')
  async createSubcategory(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateSubcategoryDto,
  ) {
    return this.productsService.createSubcategory(enterpriseId, createDto);
  }

  @Put('subcategories/:id')
  @ApiOperation({ summary: 'Update a subcategory' })
  @RequirePermission('catalog', 'subcategories', 'edit')
  async updateSubcategory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateSubcategoryDto>,
  ) {
    return this.productsService.updateSubcategory(id, enterpriseId, updateDto);
  }

  @Delete('subcategories/:id')
  @ApiOperation({ summary: 'Delete a subcategory' })
  @RequirePermission('catalog', 'subcategories', 'delete')
  async deleteSubcategory(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.deleteSubcategory(id, enterpriseId);
  }

  // ========== Products ==========

  @Get('dropdown')
  @ApiOperation({ summary: 'Get active products for dropdown use in forms (no catalog permission required)' })
  async findDropdown(
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.findDropdown(enterpriseId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @RequirePermission('catalog', 'products', 'view')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'subcategoryId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @EnterpriseId() enterpriseId: number,
    @Query('categoryId') categoryId?: number,
    @Query('subcategoryId') subcategoryId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(enterpriseId, categoryId, subcategoryId, page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @RequirePermission('catalog', 'products', 'view')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.findOne(id, enterpriseId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @RequirePermission('catalog', 'products', 'create')
  async create(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateProductDto,
  ) {
    return this.productsService.create(enterpriseId, createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @RequirePermission('catalog', 'products', 'edit')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateProductDto>,
  ) {
    return this.productsService.update(id, enterpriseId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @RequirePermission('catalog', 'products', 'delete')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.delete(id, enterpriseId);
  }

  // ========== Product Attributes ==========

  @Get(':productId/attributes')
  @ApiOperation({ summary: 'Get all attributes for a product' })
  @RequirePermission('catalog', 'products', 'view')
  async findAllAttributes(
    @Param('productId', ParseIntPipe) productId: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.findAllAttributes(productId, enterpriseId);
  }

  @Post('attributes')
  @ApiOperation({ summary: 'Create a product attribute' })
  @RequirePermission('catalog', 'products', 'create')
  async createAttribute(
    @EnterpriseId() enterpriseId: number,
    @Body() createDto: CreateProductAttributeDto,
  ) {
    return this.productsService.createAttribute(enterpriseId, createDto);
  }

  @Put('attributes/:id')
  @ApiOperation({ summary: 'Update a product attribute' })
  @RequirePermission('catalog', 'products', 'edit')
  async updateAttribute(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: Partial<CreateProductAttributeDto>,
  ) {
    return this.productsService.updateAttribute(id, enterpriseId, updateDto);
  }

  @Delete('attributes/:id')
  @ApiOperation({ summary: 'Delete a product attribute' })
  @RequirePermission('catalog', 'products', 'delete')
  async deleteAttribute(
    @Param('id', ParseIntPipe) id: number,
    @EnterpriseId() enterpriseId: number,
  ) {
    return this.productsService.deleteAttribute(id, enterpriseId);
  }
}
