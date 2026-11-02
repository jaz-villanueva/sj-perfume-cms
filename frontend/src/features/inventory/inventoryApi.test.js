
import { describe, it, expect } from 'vitest'
import { inventoryApi } from './inventoryApi.js'

describe('Inventory API', () => {
  it('uses sample data during testing', () => {
    expect(inventoryApi.isSample).toBe(true)
  })

  it('retrieves inventory records', async () => {
    const inventory = await inventoryApi.listInventory()

    expect(Array.isArray(inventory)).toBe(true)
    expect(inventory.length).toBeGreaterThan(0)

    inventory.forEach((item) => {
      expect(item).toHaveProperty('productId')
      expect(item).toHaveProperty('sku')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('onHand')
      expect(item).toHaveProperty('reorderLevel')
      expect(item).toHaveProperty('isLowStock')
    })
  })

  it('correctly identifies low-stock products', async () => {
    const inventory = await inventoryApi.listInventory()

    inventory.forEach((item) => {
      expect(item.isLowStock).toBe(
        item.onHand <= item.reorderLevel
      )
    })
  })

  
    it('records a stock-in transaction and updates inventory', async () => {
        const productId = 1

        const inventoryBefore = await inventoryApi.listInventory()
        const productBefore = inventoryBefore.find(
            (item) => item.productId === productId
        )

        const result = await inventoryApi.recordMovement({
            productId,
            kind: 'stock_in',
            quantity: 10,
            reason: 'Supplier delivery',
            reference: 'TEST-DEL-001',
        })

        const inventoryAfter = await inventoryApi.listInventory()
        const productAfter = inventoryAfter.find(
            (item) => item.productId === productId
        )

        expect(result.onHand).toBe(productBefore.onHand + 10)
        expect(productAfter.onHand).toBe(productBefore.onHand + 10)

        const movements = await inventoryApi.listMovements()
        const recordedMovement = movements.find(
            (movement) => movement.id === result.movementId
        )

        expect(recordedMovement).toBeDefined()
        expect(recordedMovement.kind).toBe('stock_in')
        expect(recordedMovement.quantity).toBe(10)
        expect(recordedMovement.reference).toBe('TEST-DEL-001')
    })

    
    it('records a product return and increases stock', async () => {
        const productId = 2

        const inventoryBefore = await inventoryApi.listInventory()
        const productBefore = inventoryBefore.find(
            (item) => item.productId === productId
        )

        const result = await inventoryApi.recordMovement({
            productId,
            kind: 'return',
            quantity: 3,
            reason: 'Customer returned unopened product',
            reference: 'RET-001',
        })

        const inventoryAfter = await inventoryApi.listInventory()
        const productAfter = inventoryAfter.find(
            (item) => item.productId === productId
        )

        expect(result.onHand).toBe(productBefore.onHand + 3)
        expect(productAfter.onHand).toBe(productBefore.onHand + 3)

        const movements = await inventoryApi.listMovements()
        const recordedMovement = movements.find(
            (movement) => movement.id === result.movementId
        )

        expect(recordedMovement).toBeDefined()
        expect(recordedMovement.kind).toBe('return')
        expect(recordedMovement.quantity).toBe(3)
        expect(recordedMovement.reason).toBe(
            'Customer returned unopened product'
        )
        expect(recordedMovement.reference).toBe('RET-001')
    })

    
    it('records a positive stock adjustment', async () => {
        const productId = 1

        const inventoryBefore = await inventoryApi.listInventory()
        const productBefore = inventoryBefore.find(
            (item) => item.productId === productId
        )

        const result = await inventoryApi.recordMovement({
            productId,
            kind: 'adjustment',
            quantity: 5,
            reason: 'Additional units found during stock count',
            reference: 'ADJ-001',
        })

        const inventoryAfter = await inventoryApi.listInventory()
        const productAfter = inventoryAfter.find(
            (item) => item.productId === productId
        )

        expect(result.onHand).toBe(productBefore.onHand + 5)
        expect(productAfter.onHand).toBe(productBefore.onHand + 5)

        const movements = await inventoryApi.listMovements()
        const recordedMovement = movements.find(
            (movement) => movement.id === result.movementId
        )

        expect(recordedMovement.kind).toBe('adjustment')
        expect(recordedMovement.quantity).toBe(5)
        expect(recordedMovement.reason).toBe(
            'Additional units found during stock count'
        )
    })

    it('records a negative stock adjustment', async () => {
        const productId = 3

        const inventoryBefore = await inventoryApi.listInventory()
        const productBefore = inventoryBefore.find(
            (item) => item.productId === productId
        )

        const result = await inventoryApi.recordMovement({
            productId,
            kind: 'adjustment',
            quantity: -1,
            reason: 'One damaged product removed',
            reference: 'ADJ-002',
        })

        const inventoryAfter = await inventoryApi.listInventory()
        const productAfter = inventoryAfter.find(
            (item) => item.productId === productId
        )

        expect(result.onHand).toBe(productBefore.onHand - 1)
        expect(productAfter.onHand).toBe(productBefore.onHand - 1)

        const movements = await inventoryApi.listMovements()
        const recordedMovement = movements.find(
            (movement) => movement.id === result.movementId
        )

        expect(recordedMovement.kind).toBe('adjustment')
        expect(recordedMovement.quantity).toBe(-1)
        expect(recordedMovement.reason).toBe(
            'One damaged product removed'
        )
    })

    
    it('prevents stock adjustments that would result in negative inventory', async () => {
        const productId = 3

        const inventoryBefore = await inventoryApi.listInventory()
        const productBefore = inventoryBefore.find(
            (item) => item.productId === productId
        )

        const movementsBefore = await inventoryApi.listMovements()

        await expect(
            inventoryApi.recordMovement({
            productId,
            kind: 'adjustment',
            quantity: -(productBefore.onHand + 10),
            reason: 'Attempt to remove more stock than available',
            reference: 'ADJ-INVALID-001',
            })
        ).rejects.toThrow(/stock cannot go below zero/i)

        const inventoryAfter = await inventoryApi.listInventory()
        const productAfter = inventoryAfter.find(
            (item) => item.productId === productId
        )

        const movementsAfter = await inventoryApi.listMovements()

        expect(productAfter.onHand).toBe(productBefore.onHand)
        expect(movementsAfter.length).toBe(movementsBefore.length)
    })

    
    it('rejects a transaction with zero quantity', async () => {
        await expect(
            inventoryApi.recordMovement({
            productId: 1,
            kind: 'stock_in',
            quantity: 0,
            reason: 'Invalid stock-in',
            })
        ).rejects.toThrow(/non-zero whole number/i)
    })

    it('rejects unsupported movement types', async () => {
        await expect(
            inventoryApi.recordMovement({
            productId: 1,
            kind: 'sale',
            quantity: -2,
            reason: 'Manual sale deduction',
            })
        ).rejects.toThrow(/valid movement type/i)
    })

    it('requires a reason for stock adjustments', async () => {
        await expect(
            inventoryApi.recordMovement({
            productId: 1,
            kind: 'adjustment',
            quantity: -2,
            reason: '',
            })
        ).rejects.toThrow(/reason is required/i)
    })



})   
