
import { supabase } from '../../lib/supabase.js'

// Convert Supabase inventory records into a consistent
// format that the React interface can use.
function fromStockRow(row) {
  return {
    productId: row.product_id,
    onHand: row.on_hand,
    updatedAt: row.updated_at,
  }
}

// Convert Supabase movement records into a consistent
// format that the React interface can use.
function fromMovementRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    kind: row.kind,
    quantity: row.quantity,
    reason: row.reason,
    reference: row.reference,
    saleId: row.sale_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}


let SAMPLE_INVENTORY = [
  {
    productId: 1,
    sku: 'SJ-000101',
    name: 'Floral Essence Perfume',
    brand: 'SJ Perfume',
    onHand: 25,
    reorderLevel: 10,
    updatedAt: null,
  },
  {
    productId: 2,
    sku: 'SJ-000102',
    name: 'Citrus Bloom Body Mist',
    brand: 'SJ Perfume',
    onHand: 5,
    reorderLevel: 5,
    updatedAt: null,
  },
  {
    productId: 3,
    sku: 'SJ-000103',
    name: 'Vanilla Dream Perfume',
    brand: 'SJ Perfume',
    onHand: 2,
    reorderLevel: 8,
    updatedAt: null,
  },
]


let SAMPLE_MOVEMENTS = []
let nextMovementId = 1


const sampleApi = {
  isSample: true,

  async listInventory() {
    return SAMPLE_INVENTORY.map((item) => ({
      ...item,
      isLowStock: item.onHand <= item.reorderLevel,
    }))
  },
  
    
    async listMovements() {
        return SAMPLE_MOVEMENTS.map((movement) => ({
            ...movement,
        }))
    },

    async recordMovement(movement) {
        const productId = Number(movement.productId)
        const quantity = Number(movement.quantity)
        const kind = movement.kind
        const reason = (movement.reason ?? '').trim()
        const reference = (movement.reference ?? '').trim()

        if (!Number.isSafeInteger(productId) || productId <= 0) {
            throw new Error('Please select a valid product.')
        }

        if (!['stock_in', 'return', 'adjustment'].includes(kind)) {
            throw new Error('Please select a valid movement type.')
        }

        if (!Number.isSafeInteger(quantity) || quantity === 0) {
            throw new Error('Quantity must be a non-zero whole number.')
        }

        if (kind !== 'adjustment' && quantity < 0) {
            throw new Error('Stock-in and return quantities must be positive.')
        }

        if (kind === 'adjustment' && !reason) {
            throw new Error('A reason is required for stock adjustments.')
        }

        const product = SAMPLE_INVENTORY.find(
            (item) => item.productId === productId
        )

        if (!product) {
            throw new Error('Product not found.')
        }

        const updatedStock = product.onHand + quantity

        if (updatedStock < 0) {
            throw new Error(
            `Only ${product.onHand} in stock; stock cannot go below zero.`
            )
        }

        const timestamp = new Date().toISOString()
        const movementId = nextMovementId++

        SAMPLE_INVENTORY = SAMPLE_INVENTORY.map((item) =>
            item.productId === productId
                ? {
                    ...item,
                    onHand: updatedStock,
                    updatedAt: timestamp,
                }
                : item
        )

        SAMPLE_MOVEMENTS = [
            {
                id: movementId,
                productId,
                kind,
                quantity,
                reason: reason || null,
                reference: reference || null,
                saleId: null,
                createdBy: null,
                createdAt: timestamp,
            },
            ...SAMPLE_MOVEMENTS,
        ]

        return {
            movementId,
            onHand: updatedStock,
        }
    },


}


const supabaseApi = {
  isSample: false,

  async listInventory() {
    const { data, error } = await supabase
      .from('product_stock')
      .select(`
        product_id,
        on_hand,
        updated_at,
        products!inner (
          id,
          sku,
          name,
          brand,
          reorder_level,
          is_active
        )
      `)
      .eq('products.is_active', true)
      .order('product_id', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map((row) => ({
      ...fromStockRow(row),
      sku: row.products.sku,
      name: row.products.name,
      brand: row.products.brand,
      reorderLevel: row.products.reorder_level,
      isLowStock: row.on_hand <= row.products.reorder_level,
    }))
  },

  
    async listMovements() {
        const { data, error } = await supabase
            .from('stock_movements')
            .select(`
                id,
                product_id,
                kind,
                quantity,
                reason,
                reference,
                sale_id,
                created_by,
                created_at
            `)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(100)

        if (error) {
            throw new Error(error.message)
        }

        return (data ?? []).map(fromMovementRow)
    },

   
    async recordMovement(movement) {
        const productId = Number(movement.productId)
        const quantity = Number(movement.quantity)
        const kind = movement.kind
        const reason = (movement.reason ?? '').trim()
        const reference = (movement.reference ?? '').trim()

        if (!Number.isSafeInteger(productId) || productId <= 0) {
            throw new Error('Please select a valid product.')
        }

        if (!['stock_in', 'return', 'adjustment'].includes(kind)) {
            throw new Error('Please select a valid movement type.')
        }

        if (!Number.isSafeInteger(quantity) || quantity === 0) {
            throw new Error('Quantity must be a non-zero whole number.')
        }

        if (kind !== 'adjustment' && quantity < 0) {
            throw new Error('Stock-in and return quantities must be positive.')
        }

        if (kind === 'adjustment' && !reason) {
            throw new Error('A reason is required for stock adjustments.')
        }

        const { data, error } = await supabase.rpc(
            'record_stock_movement',
            {
            payload: {
                product_id: productId,
                kind,
                quantity,
                reason: reason || null,
                reference: reference || null,
                },
            }
        )

        if (error) {
            throw new Error(error.hint || error.message)
        }

        return {
            movementId: data.movement_id,
            onHand: data.on_hand,
        }
    },
 

}


export const inventoryApi = supabase ? supabaseApi : sampleApi
