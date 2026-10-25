import { beforeEach, describe, expect, it } from 'vitest'
import { productsApi, resetSampleProducts } from './productsApi.js'

describe('Products API - Sample Data', () => {
  beforeEach(() => {
    resetSampleProducts()
  })

  it('retrieves the sample products', async () => {
    const products = await productsApi.listProducts()

    expect(products).toHaveLength(4)
    expect(products[0].name).toBe('Citrus Breeze')
  })

  it('creates a new product', async () => {
    const newProduct = {
      sku: 'TEST-001',
      name: 'Test Perfume',
      brand: 'Test Brand',
      scentFamily: 'Floral',
      sizeMl: 50,
      sellingPrice: 750,
      stockQuantity: 10,
      reorderLevel: 5,
    }

    const created = await productsApi.saveProduct(newProduct)
    const products = await productsApi.listProducts()

    expect(created.id).toBe(5)
    expect(products).toHaveLength(5)
    expect(products.some((product) => product.sku === 'TEST-001')).toBe(true)
  })

  it('rejects duplicate SKUs', async () => {
    await expect(
      productsApi.saveProduct({
        sku: 'sample-001',
        name: 'Duplicate Perfume',
      })
    ).rejects.toThrow('This SKU already exists.')
  })

  it('updates an existing product', async () => {
    const products = await productsApi.listProducts()
    const original = products.find((product) => product.id === 1)

    await productsApi.saveProduct({
      ...original,
      sellingPrice: 999,
    })

    const updated = await productsApi.listProducts()
    const product = updated.find((item) => item.id === 1)

    expect(product.sellingPrice).toBe(999)
  })

  it('deactivates a product', async () => {
    await productsApi.deactivateProduct(1)

    const products = await productsApi.listProducts()

    expect(products).toHaveLength(3)
    expect(products.some((product) => product.id === 1)).toBe(false)
  })
})