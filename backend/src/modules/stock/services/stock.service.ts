import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductType } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all products with their stock levels and inventory valuation
   */
  async getStockList() {
    const products = await this.prisma.product.findMany({
      where: { type: ProductType.GOODS },
      orderBy: { stockQuantity: 'asc' },
    });

    return products.map((p) => {
      const stockQty = p.stockQuantity;
      const costPrice = Number(p.costPrice);
      const salesPrice = Number(p.salesPrice);
      const inventoryValuation = stockQty * costPrice;
      const potentialRevenue = stockQty * salesPrice;

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        stockQuantity: stockQty,
        costPrice,
        salesPrice,
        inventoryValuation,
        potentialRevenue,
        isLowStock: stockQty <= 5,
        isOutOfStock: stockQty === 0,
      };
    });
  }

  /**
   * Get high-level inventory KPI summary
   */
  async getStockSummary() {
    const goodsProducts = await this.prisma.product.findMany({
      where: { type: ProductType.GOODS },
    });

    let totalUnits = 0;
    let totalValuation = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of goodsProducts) {
      const qty = p.stockQuantity;
      totalUnits += qty;
      totalValuation += qty * Number(p.costPrice);

      if (qty === 0) outOfStockCount++;
      else if (qty <= 5) lowStockCount++;
    }

    return {
      totalDistinctGoods: goodsProducts.length,
      totalUnitsInStock: totalUnits,
      totalInventoryValuation: Number(totalValuation.toFixed(2)),
      outOfStockProductsCount: outOfStockCount,
      lowStockProductsCount: lowStockCount,
    };
  }
}
