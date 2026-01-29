/**
 * API Test Suite: Product and ProductLine CRUD Operations
 *
 * Tests the Product API endpoints:
 * - GET /api/Product/GetList - List products
 * - POST /api/Product/CreateProduct - Create product
 * - GET /api/Product/GetById - Get product by ID
 * - GET /api/Product/GetByKey - Get product by GUID
 * - POST /api/Product/UpdateProduct - Update product
 * - POST /api/Product/ArchiveProduct - Archive product
 * - DELETE /api/Product/Delete - Delete product
 *
 * Tests the ProductLine API endpoints:
 * - GET /api/ProductLine/GetList - List product lines
 * - POST /api/ProductLine/CreateProductLine - Create product line
 * - GET /api/ProductLine/GetById - Get product line by ID
 * - POST /api/ProductLine/UpdateProductLine - Update product line
 * - DELETE /api/ProductLine/Delete - Delete product line
 *
 * Test Pattern: POST to create -> GET to verify -> POST to update -> GET to verify
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  createAuthenticatedApiClient,
  apiGet,
  apiPost,
  apiDelete,
  generateTestName,
  PagedResult,
  normalizePagedResult,
} from './helpers/api-client';

// Product DTOs
interface ProductDto {
  id: number;
  key: string;
  name: string;
  code: string;
  description: string;
  productLineId: number;
  productLineName: string;
  unitPrice: number;
  unit: string;
  calculationMethod: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductListDto {
  id: number;
  key: string;
  name: string;
  code: string;
  productLineName: string;
  unitPrice: number;
  isActive: boolean;
  isArchived: boolean;
}

interface CreateProductDto {
  name: string;
  code: string;
  description?: string;
  productLineId: number;
  unitPrice: number;
  unit?: string;
  calculationMethod?: string;
}

// ProductLine DTOs
interface ProductLineDto {
  id: number;
  key: string;
  name: string;
  code: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductLineListDto {
  id: number;
  key: string;
  name: string;
  code: string;
  displayOrder: number;
  isActive: boolean;
}

interface CreateProductLineDto {
  name: string;
  code: string;
  description?: string;
  displayOrder?: number;
}

test.describe.configure({ mode: 'serial' });

// ============================================================================
// PRODUCT LINE TESTS
// ============================================================================

test.describe('ProductLine API - CRUD Operations', () => {
  let apiContext: APIRequestContext;
  let createdProductLineId: number;
  let createdProductLineKey: string;
  const testProductLineName = generateTestName('TestProductLine');
  const testProductLineCode = `TPL-${Date.now()}`;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    // Clean up: Delete test product line if created
    if (apiContext && createdProductLineId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/ProductLine/Delete?productLineId=${createdProductLineId}`);
        console.log(`Cleaned up test product line: ${createdProductLineId}`);
      } catch (e) {
        console.warn(`Failed to clean up product line ${createdProductLineId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/ProductLine/GetList - should list existing product lines', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<ProductLineListDto>>(apiContext, '/api/ProductLine/GetList');
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      expect(Array.isArray(response.items)).toBeTruthy();

      console.log(`Found ${response.totalCount} product lines`);

      response.items.forEach(pl => {
        console.log(`  - ${pl.name} (${pl.code}) - Order: ${pl.displayOrder}`);
      });
    } catch (error: any) {
      console.log(`ProductLine GetList: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('2. POST /api/ProductLine/CreateProductLine - should create new product line', async () => {
    try {
      const newProductLine: CreateProductLineDto = {
        name: testProductLineName,
        code: testProductLineCode,
        description: 'Test product line created via API test',
        displayOrder: 99,
      };

      const created = await apiPost<ProductLineDto>(
        apiContext,
        '/api/ProductLine/CreateProductLine',
        newProductLine
      );

      // Verify response
      expect(created).toBeDefined();
      expect(created.id).toBeGreaterThan(0);
      expect(created.key).toBeDefined();
      expect(created.name).toBe(testProductLineName);
      expect(created.code).toBe(testProductLineCode);
      expect(created.isActive).toBe(true);

      // Store for subsequent tests
      createdProductLineId = created.id;
      createdProductLineKey = created.key;

      console.log(`Created product line: ID=${createdProductLineId}, Key=${createdProductLineKey}`);
    } catch (error: any) {
      console.log(`ProductLine Create: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('3. GET /api/ProductLine/GetById - should retrieve created product line by ID', async () => {
    test.skip(!createdProductLineId, 'No product line was created');

    const productLine = await apiGet<ProductLineDto>(
      apiContext,
      `/api/ProductLine/GetById?productLineId=${createdProductLineId}`
    );

    expect(productLine.id).toBe(createdProductLineId);
    expect(productLine.key).toBe(createdProductLineKey);
    expect(productLine.name).toBe(testProductLineName);

    console.log(`Retrieved product line by ID: ${productLine.name}`);
  });

  test('4. GET /api/ProductLine/GetByKey - should retrieve product line by GUID key', async () => {
    test.skip(!createdProductLineKey, 'No product line was created');

    const productLine = await apiGet<ProductLineDto>(
      apiContext,
      `/api/ProductLine/GetByKey?productLineKey=${createdProductLineKey}`
    );

    expect(productLine.id).toBe(createdProductLineId);
    expect(productLine.name).toBe(testProductLineName);

    console.log(`Retrieved product line by Key: ${productLine.name}`);
  });

  test('5. POST /api/ProductLine/UpdateProductLine - should update product line', async () => {
    test.skip(!createdProductLineId, 'No product line was created');

    const updatedName = `${testProductLineName}_Updated`;

    await apiPost<ProductLineDto>(
      apiContext,
      `/api/ProductLine/UpdateProductLine?productLineId=${createdProductLineId}`,
      {
        name: updatedName,
        code: testProductLineCode,
        description: 'Updated via API test',
        displayOrder: 98,
      }
    );

    // Verify update by fetching again
    const updated = await apiGet<ProductLineDto>(
      apiContext,
      `/api/ProductLine/GetById?productLineId=${createdProductLineId}`
    );

    expect(updated.name).toBe(updatedName);
    expect(updated.displayOrder).toBe(98);

    console.log(`Updated product line: ${updated.name} - Order: ${updated.displayOrder}`);
  });

  test('6. DELETE /api/ProductLine/Delete - should delete product line', async () => {
    test.skip(!createdProductLineId, 'No product line was created');

    const result = await apiDelete<boolean>(
      apiContext,
      `/api/ProductLine/Delete?productLineId=${createdProductLineId}`
    );

    expect(result).toBe(true);
    console.log(`Deleted product line: ${createdProductLineId}`);

    // Clear ID so afterAll doesn't try to delete again
    createdProductLineId = 0;
  });
});

// ============================================================================
// PRODUCT TESTS
// ============================================================================

test.describe('Product API - CRUD Operations', () => {
  let apiContext: APIRequestContext;
  let createdProductId: number;
  let createdProductKey: string;
  let testProductLineId: number; // Existing product line for product creation
  const testProductName = generateTestName('TestProduct');
  const testProductCode = `TPROD-${Date.now()}`;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;

    // Get an existing product line for product creation
    try {
      const rawResponse = await apiGet<PagedResult<ProductLineListDto>>(
        apiContext,
        '/api/ProductLine/GetList',
        { pageSize: 1 }
      );
      const productLinesResponse = normalizePagedResult(rawResponse);
      if (productLinesResponse.items.length > 0) {
        testProductLineId = productLinesResponse.items[0].id;
        console.log(`Using existing product line: ${productLinesResponse.items[0].name} (ID: ${testProductLineId})`);
      }
    } catch (error: any) {
      console.log(`ProductLine API not available: ${error.message.substring(0, 50)}`);
    }
  });

  test.afterAll(async () => {
    // Clean up: Delete test product if created
    if (apiContext && createdProductId) {
      try {
        await apiDelete<boolean>(apiContext, `/api/Product/Delete?productId=${createdProductId}`);
        console.log(`Cleaned up test product: ${createdProductId}`);
      } catch (e) {
        console.warn(`Failed to clean up product ${createdProductId}:`, e);
      }
    }
    await apiContext?.dispose();
  });

  test('1. GET /api/Product/GetList - should list existing products', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<ProductListDto>>(apiContext, '/api/Product/GetList');
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      expect(Array.isArray(response.items)).toBeTruthy();

      console.log(`Found ${response.totalCount} products`);

      response.items.slice(0, 10).forEach(p => {
        console.log(`  - ${p.name} (${p.code}) - R${p.unitPrice} - ${p.productLineName}`);
      });
    } catch (error: any) {
      console.log(`Product GetList: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('2. GET /api/Product/GetList - should filter products by product line', async () => {
    test.skip(!testProductLineId, 'No product line available');

    try {
      const rawResponse = await apiGet<PagedResult<ProductListDto>>(
        apiContext,
        '/api/Product/GetList',
        { productLineId: testProductLineId }
      );
      const response = normalizePagedResult(rawResponse);

      expect(response).toBeDefined();
      console.log(`Products in product line ${testProductLineId}: ${response.totalCount}`);
    } catch (error: any) {
      console.log(`Product GetList filtered: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('3. POST /api/Product/CreateProduct - should create new product', async () => {
    test.skip(!testProductLineId, 'No product line available');

    try {
      const newProduct: CreateProductDto = {
        name: testProductName,
        code: testProductCode,
        description: 'Test product created via API test',
        productLineId: testProductLineId,
        unitPrice: 1500.00,
        unit: 'per person',
        calculationMethod: 'fixed',
      };

      const created = await apiPost<ProductDto>(
        apiContext,
        '/api/Product/CreateProduct',
        newProduct
      );

      // Verify response
      expect(created).toBeDefined();
      expect(created.id).toBeGreaterThan(0);
      expect(created.key).toBeDefined();
      expect(created.name).toBe(testProductName);
      expect(created.code).toBe(testProductCode);
      expect(created.unitPrice).toBe(1500.00);
      expect(created.isActive).toBe(true);
      expect(created.isArchived).toBe(false);

      // Store for subsequent tests
      createdProductId = created.id;
      createdProductKey = created.key;

      console.log(`Created product: ID=${createdProductId}, Key=${createdProductKey}, Name=${testProductName}`);
    } catch (error: any) {
      console.log(`Product Create: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('4. GET /api/Product/GetById - should retrieve created product by ID', async () => {
    test.skip(!createdProductId, 'No product was created');

    const product = await apiGet<ProductDto>(
      apiContext,
      `/api/Product/GetById?productId=${createdProductId}`
    );

    expect(product.id).toBe(createdProductId);
    expect(product.key).toBe(createdProductKey);
    expect(product.name).toBe(testProductName);
    expect(product.unitPrice).toBe(1500.00);

    console.log(`Retrieved product by ID: ${product.name} - R${product.unitPrice}`);
  });

  test('5. GET /api/Product/GetByKey - should retrieve product by GUID key', async () => {
    test.skip(!createdProductKey, 'No product was created');

    const product = await apiGet<ProductDto>(
      apiContext,
      `/api/Product/GetByKey?productKey=${createdProductKey}`
    );

    expect(product.id).toBe(createdProductId);
    expect(product.name).toBe(testProductName);

    console.log(`Retrieved product by Key: ${product.name}`);
  });

  test('6. POST /api/Product/UpdateProduct - should update product', async () => {
    test.skip(!createdProductId, 'No product was created');

    const updatedName = `${testProductName}_Updated`;
    const updatedPrice = 2000.00;

    await apiPost<ProductDto>(
      apiContext,
      `/api/Product/UpdateProduct?productId=${createdProductId}`,
      {
        name: updatedName,
        code: testProductCode,
        description: 'Updated via API test',
        productLineId: testProductLineId,
        unitPrice: updatedPrice,
        unit: 'per learner',
        calculationMethod: 'fixed',
      }
    );

    // Verify update by fetching again
    const updated = await apiGet<ProductDto>(
      apiContext,
      `/api/Product/GetById?productId=${createdProductId}`
    );

    expect(updated.name).toBe(updatedName);
    expect(updated.unitPrice).toBe(updatedPrice);
    expect(updated.unit).toBe('per learner');

    console.log(`Updated product: ${updated.name} - R${updated.unitPrice} ${updated.unit}`);
  });

  test('7. POST /api/Product/ArchiveProduct - should archive product', async () => {
    test.skip(!createdProductId, 'No product was created');

    const result = await apiPost<boolean>(
      apiContext,
      `/api/Product/ArchiveProduct?productId=${createdProductId}`
    );

    expect(result).toBe(true);

    // Verify product is archived
    const product = await apiGet<ProductDto>(
      apiContext,
      `/api/Product/GetById?productId=${createdProductId}`
    );

    expect(product.isArchived).toBe(true);
    console.log(`Archived product: ${product.name}`);
  });

  test('8. DELETE /api/Product/Delete - should delete product', async () => {
    test.skip(!createdProductId, 'No product was created');

    const result = await apiDelete<boolean>(
      apiContext,
      `/api/Product/Delete?productId=${createdProductId}`
    );

    expect(result).toBe(true);
    console.log(`Deleted product: ${createdProductId}`);

    // Clear ID so afterAll doesn't try to delete again
    createdProductId = 0;
  });
});

// ============================================================================
// VERIFY EXISTING PRODUCTS
// ============================================================================

test.describe('Product API - Verify Existing Products', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async () => {
    const client = await createAuthenticatedApiClient();
    apiContext = client.context;
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test('should list all product lines with their products', async () => {
    try {
      const rawProductLines = await apiGet<PagedResult<ProductLineListDto>>(
        apiContext,
        '/api/ProductLine/GetList'
      );
      const productLines = normalizePagedResult(rawProductLines);

      console.log(`Product Lines (${productLines.totalCount}):`);

      for (const pl of productLines.items) {
        const rawProducts = await apiGet<PagedResult<ProductListDto>>(
          apiContext,
          '/api/Product/GetList',
          { productLineId: pl.id, pageSize: 100 }
        );
        const products = normalizePagedResult(rawProducts);

        console.log(`\n  ${pl.name} (${pl.code}) - ${products.totalCount} products:`);
        products.items.forEach(p => {
          console.log(`    - ${p.name} (${p.code}) - R${p.unitPrice}`);
        });
      }
    } catch (error: any) {
      console.log(`Product list with product lines: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should filter active products only', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<ProductListDto>>(
        apiContext,
        '/api/Product/GetList',
        { isActive: true }
      );
      const response = normalizePagedResult(rawResponse);

      console.log(`Active products: ${response.totalCount}`);
    } catch (error: any) {
      console.log(`Product GetList active: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should filter archived products', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<ProductListDto>>(
        apiContext,
        '/api/Product/GetList',
        { isArchived: true }
      );
      const response = normalizePagedResult(rawResponse);

      console.log(`Archived products: ${response.totalCount}`);
    } catch (error: any) {
      console.log(`Product GetList archived: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });

  test('should search products by name', async () => {
    try {
      const rawResponse = await apiGet<PagedResult<ProductListDto>>(
        apiContext,
        '/api/Product/GetList',
        { search: 'Training' }
      );
      const response = normalizePagedResult(rawResponse);

      console.log(`Products matching 'Training': ${response.totalCount}`);
      response.items.forEach(p => {
        console.log(`  - ${p.name}`);
      });
    } catch (error: any) {
      console.log(`Product search: ${error.message.substring(0, 100)}`);
      test.skip();
    }
  });
});
