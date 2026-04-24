import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Product } from './entities/product.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductBomService } from './product-bom.service';
import {
  CreateCategoryDto,
  CreateSubcategoryDto,
  CreateProductDto,
  CreateProductAttributeDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductAttribute)
    private attributeRepository: Repository<ProductAttribute>,
    private productBomService: ProductBomService,
    private dataSource: DataSource,
  ) {}

  // ========== Categories ==========

  async findAllCategories(enterpriseId: number, page = 1, limit = 20, search?: string) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere('category.categoryName ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('category.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Categories fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOneCategory(id: number, enterpriseId: number) {
    const category = await this.categoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      message: 'Category fetched successfully',
      data: category,
    };
  }

  async createCategory(enterpriseId: number, createDto: CreateCategoryDto) {
    const category = this.categoryRepository.create({
      ...createDto,
      enterpriseId,
    });

    const saved = await this.categoryRepository.save(category);

    return {
      message: 'Category created successfully',
      data: saved,
    };
  }

  async updateCategory(id: number, enterpriseId: number, updateDto: Partial<CreateCategoryDto>) {
    const category = await this.categoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryRepository.update(id, updateDto);

    return this.findOneCategory(id, enterpriseId);
  }

  async deleteCategory(id: number, enterpriseId: number) {
    const category = await this.categoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Block if products or subcategories still reference this category.
    const subCount = await this.subcategoryRepository
      .createQueryBuilder('s')
      .where('s.categoryId = :id', { id })
      .andWhere('s.enterpriseId = :enterpriseId', { enterpriseId })
      .getCount();
    if (subCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.categoryName}". It has ${subCount} subcategor${subCount === 1 ? 'y' : 'ies'}. Delete or reassign them first.`,
      );
    }
    const prodCount = await this.productRepository
      .createQueryBuilder('p')
      .where('p.categoryId = :id', { id })
      .andWhere('p.enterpriseId = :enterpriseId', { enterpriseId })
      .getCount();
    if (prodCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.categoryName}". It is used by ${prodCount} product(s). Reassign those products first.`,
      );
    }

    await this.categoryRepository.delete(id);

    return {
      message: 'Category deleted successfully',
      data: null,
    };
  }

  // ========== Subcategories ==========

  async findAllSubcategories(enterpriseId: number, categoryId?: number, page = 1, limit = 20, search?: string) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.subcategoryRepository
      .createQueryBuilder('subcategory')
      .leftJoinAndSelect('subcategory.category', 'category')
      .where('subcategory.enterpriseId = :enterpriseId', { enterpriseId });

    if (categoryId) {
      query.andWhere('subcategory.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      query.andWhere('subcategory.subcategoryName ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('subcategory.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Subcategories fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOneSubcategory(id: number, enterpriseId: number) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id, enterpriseId },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    return {
      message: 'Subcategory fetched successfully',
      data: subcategory,
    };
  }

  async createSubcategory(enterpriseId: number, createDto: CreateSubcategoryDto) {
    const subcategory = this.subcategoryRepository.create({
      ...createDto,
      enterpriseId,
    });

    const saved = await this.subcategoryRepository.save(subcategory);

    return {
      message: 'Subcategory created successfully',
      data: saved,
    };
  }

  async updateSubcategory(id: number, enterpriseId: number, updateDto: Partial<CreateSubcategoryDto>) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    await this.subcategoryRepository.update(id, updateDto);

    return this.findOneSubcategory(id, enterpriseId);
  }

  async deleteSubcategory(id: number, enterpriseId: number) {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    // Block delete if any product still references this subcategory.
    const usingProducts = await this.productRepository
      .createQueryBuilder('p')
      .where('p.subcategoryId = :id', { id })
      .andWhere('p.enterpriseId = :enterpriseId', { enterpriseId })
      .select(['p.id', 'p.productName', 'p.productCode'])
      .limit(5)
      .getMany();

    if (usingProducts.length > 0) {
      const sample = usingProducts
        .map((p) => p.productName || p.productCode || `#${p.id}`)
        .join(', ');
      throw new BadRequestException(
        `Cannot delete subcategory "${subcategory.subcategoryName}". It is used by ${usingProducts.length}${usingProducts.length === 5 ? '+' : ''} product(s): ${sample}. Reassign those products first.`,
      );
    }

    await this.subcategoryRepository.delete(id);

    return {
      message: 'Subcategory deleted successfully',
      data: null,
    };
  }

  // ========== Products ==========

  async findDropdown(enterpriseId: number) {
    const data = await this.productRepository.find({
      where: { enterpriseId, status: 'active' },
      relations: ['category', 'subcategory'],
      order: { productName: 'ASC' },
    });
    return { message: 'Products fetched successfully', data };
  }

  async findAll(enterpriseId: number, categoryId?: number, subcategoryId?: number, page = 1, limit = 20, search?: string) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('product.productBom', 'productBom', "productBom.status = 'active'")
      .where('product.enterpriseId = :enterpriseId', { enterpriseId });

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (subcategoryId) {
      query.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId });
    }

    if (search) {
      query.andWhere(
        '(product.productName ILIKE :search OR product.productCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('product.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Products fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const product = await this.productRepository.findOne({
      where: { id, enterpriseId },
      relations: ['category', 'subcategory'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Attach master BOM (if any) so the edit form can pre-fill
    const bomRes = await this.productBomService.getByProductId(id, enterpriseId);
    const bom = bomRes.data;
    if (bom && bom.items) {
      bom.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    return {
      message: 'Product fetched successfully',
      data: { ...product, productBom: bom ?? null },
    };
  }

  async create(enterpriseId: number, createDto: CreateProductDto) {
    const { bom, ...productFields } = createDto;

    const savedId = await this.dataSource.transaction(async (manager) => {
      const product = manager.create(Product, {
        ...productFields,
        enterpriseId,
      });
      const saved = await manager.save(Product, product);

      if (bom && bom.items && bom.items.length > 0) {
        await this.productBomService.upsertForProduct(saved.id, enterpriseId, bom, manager);
      }

      return saved.id;
    });

    return this.findOne(savedId, enterpriseId);
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateProductDto>) {
    const { bom, ...productFields } = updateDto;

    const product = await this.productRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.dataSource.transaction(async (manager) => {
      if (Object.keys(productFields).length > 0) {
        await manager.update(Product, id, productFields);
      }

      if (bom !== undefined) {
        if (bom && bom.items && bom.items.length > 0) {
          await this.productBomService.upsertForProduct(id, enterpriseId, bom, manager);
        } else {
          // Empty bom payload means: remove the master (archive if referenced)
          await this.productBomService.archive(id, enterpriseId, manager);
        }
      }
    });

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const product = await this.productRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Block delete if this product is referenced in business records
    const manager = this.productRepository.manager;
    const [qi] = await manager.query(
      `SELECT q.quotation_number FROM quotation_items qi
       JOIN quotations q ON q.id = qi.quotation_id
       WHERE qi.product_id = $1 LIMIT 1`,
      [id],
    );
    if (qi) {
      throw new BadRequestException(
        `Cannot delete product "${product.productName}". It is used in Quotation ${qi.quotation_number || '(linked)'}. Remove it from that quotation first.`,
      );
    }
    const [ii] = await manager.query(
      `SELECT i.invoice_number FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE ii.product_id = $1 LIMIT 1`,
      [id],
    );
    if (ii) {
      throw new BadRequestException(
        `Cannot delete product "${product.productName}". It is used in Invoice ${ii.invoice_number || '(linked)'}. Remove it from that invoice first.`,
      );
    }
    const [soi] = await manager.query(
      `SELECT so.sales_order_number FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.sales_order_id
       WHERE soi.product_id = $1 LIMIT 1`,
      [id],
    );
    if (soi) {
      throw new BadRequestException(
        `Cannot delete product "${product.productName}". It is used in Purchase Order ${soi.sales_order_number || '(linked)'}.`,
      );
    }

    // Archive master BOM (keeps historical PO-BOM provenance intact)
    await this.productBomService.archive(id, enterpriseId);

    // Delete related attributes first
    await this.attributeRepository.delete({ productId: id });
    await this.productRepository.delete(id);

    return {
      message: 'Product deleted successfully',
      data: null,
    };
  }

  // ========== Product Attributes ==========

  async findAllAttributes(productId: number, enterpriseId: number) {
    // Verify product belongs to enterprise
    const product = await this.productRepository.findOne({
      where: { id: productId, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const attributes = await this.attributeRepository.find({
      where: { productId },
      order: { sortOrder: 'ASC' },
    });

    return {
      message: 'Product attributes fetched successfully',
      data: attributes,
    };
  }

  async createAttribute(enterpriseId: number, createDto: CreateProductAttributeDto) {
    // Verify product belongs to enterprise
    const product = await this.productRepository.findOne({
      where: { id: createDto.productId, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const attribute = this.attributeRepository.create(createDto);
    const saved = await this.attributeRepository.save(attribute);

    return {
      message: 'Product attribute created successfully',
      data: saved,
    };
  }

  async updateAttribute(id: number, enterpriseId: number, updateDto: Partial<CreateProductAttributeDto>) {
    const attribute = await this.attributeRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!attribute) {
      throw new NotFoundException('Product attribute not found');
    }

    // Verify product belongs to enterprise
    const product = await this.productRepository.findOne({
      where: { id: attribute.productId, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.attributeRepository.update(id, updateDto);

    const updated = await this.attributeRepository.findOne({ where: { id } });

    return {
      message: 'Product attribute updated successfully',
      data: updated,
    };
  }

  async deleteAttribute(id: number, enterpriseId: number) {
    const attribute = await this.attributeRepository.findOne({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException('Product attribute not found');
    }

    // Verify product belongs to enterprise
    const product = await this.productRepository.findOne({
      where: { id: attribute.productId, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.attributeRepository.delete(id);

    return {
      message: 'Product attribute deleted successfully',
      data: null,
    };
  }
}
