import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Subcategory } from './entities/subcategory.entity';
import { Product } from './entities/product.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
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

    return {
      message: 'Product fetched successfully',
      data: product,
    };
  }

  async create(enterpriseId: number, createDto: CreateProductDto) {
    const product = this.productRepository.create({
      ...createDto,
      enterpriseId,
    });

    const saved = await this.productRepository.save(product);

    return {
      message: 'Product created successfully',
      data: saved,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: Partial<CreateProductDto>) {
    const product = await this.productRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productRepository.update(id, updateDto);

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const product = await this.productRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

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
