import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductBom } from './entities/product-bom.entity';
import { ProductBomItem } from './entities/product-bom-item.entity';
import { UpsertProductBomDto, ProductBomItemDto } from './dto/product-bom.dto';

@Injectable()
export class ProductBomService {
  constructor(
    @InjectRepository(ProductBom)
    private productBomRepository: Repository<ProductBom>,
    @InjectRepository(ProductBomItem)
    private productBomItemRepository: Repository<ProductBomItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  private async generateBomNumber(enterpriseId: number, manager?: EntityManager): Promise<string> {
    const repo = manager ? manager.getRepository(ProductBom) : this.productBomRepository;
    const count = await repo.count({ where: { enterpriseId } });
    return `PBOM-${String(count + 1).padStart(6, '0')}`;
  }

  private mapItems(productBomId: number, items: ProductBomItemDto[]): Partial<ProductBomItem>[] {
    return items.map((item, index) => ({
      productBomId,
      rawMaterialId: item.rawMaterialId ?? undefined,
      componentProductId: item.componentProductId ?? undefined,
      itemName: item.itemName,
      requiredQuantity: parseFloat(Math.min(Number(item.requiredQuantity), 9999999999999).toFixed(2)),
      unitOfMeasure: item.unitOfMeasure,
      isCustom: item.isCustom ?? (!item.rawMaterialId && !item.componentProductId),
      notes: item.notes,
      sortOrder: item.sortOrder ?? index,
    }));
  }

  async getByProductId(productId: number, enterpriseId: number) {
    const product = await this.productRepository.findOne({ where: { id: productId, enterpriseId } });
    if (!product) throw new NotFoundException('Product not found');

    const bom = await this.productBomRepository.findOne({
      where: { productId, enterpriseId, status: 'active' },
      relations: ['items', 'items.rawMaterial', 'items.componentProduct'],
    });

    if (bom && bom.items) {
      bom.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    return {
      message: bom ? 'Product BOM fetched successfully' : 'Product has no BOM yet',
      data: bom,
    };
  }

  async upsertForProduct(
    productId: number,
    enterpriseId: number,
    dto: UpsertProductBomDto,
    manager?: EntityManager,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('BOM requires at least one material line');
    }

    const exec = async (m: EntityManager) => {
      const product = await m.findOne(Product, { where: { id: productId, enterpriseId } });
      if (!product) throw new NotFoundException('Product not found');

      let bom = await m.findOne(ProductBom, {
        where: { productId, enterpriseId, status: 'active' },
      });

      if (bom) {
        // Update: replace items atomically, bump version
        await m.delete(ProductBomItem, { productBomId: bom.id });
        bom.version = (bom.version ?? 1) + 1;
        bom.notes = dto.notes ?? bom.notes;
        await m.save(ProductBom, bom);
      } else {
        const bomNumber = await this.generateBomNumber(enterpriseId, m);
        bom = m.create(ProductBom, {
          enterpriseId,
          productId,
          bomNumber,
          version: 1,
          notes: dto.notes,
          status: 'active',
        });
        bom = await m.save(ProductBom, bom);
      }

      const items = this.mapItems(bom.id, dto.items);
      await m.save(ProductBomItem, items);

      return bom.id;
    };

    const bomId = manager ? await exec(manager) : await this.dataSource.transaction(exec);

    const saved = await this.productBomRepository.findOne({
      where: { id: bomId },
      relations: ['items', 'items.rawMaterial', 'items.componentProduct'],
    });
    if (saved && saved.items) {
      saved.items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }

    return {
      message: 'Product BOM saved successfully',
      data: saved,
    };
  }

  async archive(productId: number, enterpriseId: number, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(ProductBom) : this.productBomRepository;
    const bom = await repo.findOne({ where: { productId, enterpriseId, status: 'active' } });
    if (!bom) return { message: 'No active product BOM to archive', data: null };
    bom.status = 'archived';
    await repo.save(bom);
    return { message: 'Product BOM archived', data: bom };
  }

  async delete(productId: number, enterpriseId: number) {
    return this.dataSource.transaction(async (m) => {
      const bom = await m.findOne(ProductBom, {
        where: { productId, enterpriseId, status: 'active' },
      });
      if (!bom) {
        throw new NotFoundException('No active BOM for this product');
      }

      // Only hard-delete if no PO BOM references this master
      const referenced = await m.query(
        `SELECT 1 FROM bill_of_materials WHERE product_bom_id = $1 LIMIT 1`,
        [bom.id],
      );
      if (referenced && referenced.length > 0) {
        // Archive instead of delete when referenced
        bom.status = 'archived';
        await m.save(ProductBom, bom);
        return { message: 'Product BOM archived (referenced by historical manufacturing BOMs)', data: bom };
      }

      await m.delete(ProductBomItem, { productBomId: bom.id });
      await m.delete(ProductBom, bom.id);
      return { message: 'Product BOM deleted', data: null };
    });
  }
}
