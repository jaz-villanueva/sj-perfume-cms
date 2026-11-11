
import { supabase } from '../../lib/supabase.js'

// Sample product records for development and testing.
const SAMPLE = [
  {
    id: 1,
    sku: 'SAMPLE-001',
    name: 'Midnight Bloom',
    brand: 'Sample Brand A',
    scentFamily: 'Floral',
    sizeMl: 50,
    sellingPrice: 850,
    resellerPrice: 0,
    stockQuantity: 12,
    reorderLevel: 5,
    description: '',
    showInCatalog: false,
    photoPath: null,
  },
  {
    id: 2,
    sku: 'SAMPLE-002',
    name: 'Citrus Breeze',
    brand: 'Sample Brand B',
    scentFamily: 'Citrus',
    sizeMl: 30,
    sellingPrice: 550,
    resellerPrice: 0,
    stockQuantity: 3,
    reorderLevel: 5,
    description: '',
    showInCatalog: false,
    photoPath: null,
  },
  {
    id: 3,
    sku: 'SAMPLE-003',
    name: 'Velvet Woods',
    brand: 'Sample Brand C',
    scentFamily: 'Woody',
    sizeMl: 100,
    sellingPrice: 1200,
    resellerPrice: 0,
    stockQuantity: 0,
    reorderLevel: 5,
    description: '',
    showInCatalog: false,
    photoPath: null,
  },
  {
    id: 4,
    sku: 'SAMPLE-004',
    name: 'Ocean Mist',
    brand: 'Sample Brand A',
    scentFamily: 'Aquatic',
    sizeMl: 50,
    sellingPrice: 750,
    resellerPrice: 0,
    stockQuantity: 8,
    reorderLevel: 5,
    description: '',
    showInCatalog: false,
    photoPath: null,
  },
]

// Working copy of the sample records.
let sample = []
let nextId = 1

export function resetSampleProducts() {
  sample = SAMPLE.map((product) => ({ ...product }))
  nextId = sample.length + 1
}

resetSampleProducts()

const sampleApi = {
  isSample: true,

  async listProducts() {
    return sample
      .filter((product) => product.isActive !== false)
      .map((product) => ({ ...product }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  async saveProduct(draft) {
    const sku = draft.sku.trim().toUpperCase()

    const duplicate = sample.some(
      (product) =>
        product.id !== draft.id &&
        product.sku.toUpperCase() === sku
    )

    if (duplicate) {
      throw new Error(
        'This SKU already exists. Please use a unique SKU.'
      )
    }

    const productData = {
      sku,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      scentFamily: draft.scentFamily.trim(),
      sizeMl: Number(draft.sizeMl),
      sellingPrice: Number(draft.sellingPrice),
      resellerPrice: Number(draft.resellerPrice),
      stockQuantity: Number(draft.stockQuantity),
      reorderLevel: Number(draft.reorderLevel),
    }

    if (draft.description !== undefined) {
      productData.description = draft.description.trim()
    }

    if (draft.showInCatalog !== undefined) {
      productData.showInCatalog = draft.showInCatalog === true
    }

    if (draft.id != null) {
      const existing = sample.find(
        (product) =>
          product.id === draft.id &&
          product.isActive !== false
      )

      if (!existing) {
        throw new Error('Product not found.')
      }

      Object.assign(existing, productData)
      return { ...existing }
    }

    const created = {
      id: nextId++,
      description: '',
      showInCatalog: false,
      photoPath: null,
      ...productData,
      isActive: true,
    }

    sample.push(created)
    return { ...created }
  },

  async deactivateProduct(id) {
    const existing = sample.find(
      (product) =>
        product.id === id &&
        product.isActive !== false
    )

    if (!existing) {
      throw new Error('Product not found.')
    }

    existing.isActive = false
    return { ...existing }
  },
}

function fromRow(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand ?? '',
    scentFamily: row.scent_family ?? '',
    sizeMl: row.size_ml,
    sellingPrice: Number(row.retail_price),
    resellerPrice: Number(row.reseller_price),
    stockQuantity: row.product_stock?.on_hand ?? 0,
    reorderLevel: row.reorder_level,
    description: row.description ?? '',
    showInCatalog: row.show_in_catalog === true,
    photoPath: row.photo_path ?? null,
    isActive: row.is_active,
  }
}

function toRow(product) {
  const row = {
    sku: product.sku.trim().toUpperCase(),
    name: product.name.trim(),
    brand: product.brand.trim(),
    scent_family: product.scentFamily.trim(),
    size_ml: Number(product.sizeMl),
    retail_price: Number(product.sellingPrice),
    reseller_price: Number(product.resellerPrice),
    reorder_level: Number(product.reorderLevel),
  }

  // Only update Catalog fields when supplied by the form.
  // This prevents older forms from clearing existing values.
  if (product.description !== undefined) {
    row.description = product.description.trim()
  }

  if (product.showInCatalog !== undefined) {
    row.show_in_catalog = product.showInCatalog === true
  }

  return row
}

async function recordInitialStock(productId, quantity) {
  const initialQuantity = Number(quantity)

  if (
    !Number.isInteger(initialQuantity) ||
    initialQuantity < 0
  ) {
    throw new Error(
      'Initial stock must be a non-negative whole number.'
    )
  }

  if (initialQuantity === 0) {
    return null
  }

  const { data, error } = await supabase.rpc(
    'record_stock_movement',
    {
      payload: {
        product_id: productId,
        kind: 'stock_in',
        quantity: initialQuantity,
        reason: 'Initial product stock',
      },
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return data
}

const supabaseApi = {
  isSample: false,

  async listProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        sku,
        name,
        brand,
        scent_family,
        size_ml,
        retail_price,
        reseller_price,
        reorder_level,
        description,
        show_in_catalog,
        photo_path,
        is_active,
        product_stock(on_hand)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(1000)

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map(fromRow)
  },

  async saveProduct(draft) {
    const productData = toRow(draft)

    if (draft.id != null) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', draft.id)
        .eq('is_active', true)
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error(
            'This SKU already exists. Please use a unique SKU.'
          )
        }

        throw new Error(error.message)
      }

      return { ...draft }
    }

    // New products remain unpublished unless explicitly selected.
    if (productData.show_in_catalog === undefined) {
      productData.show_in_catalog = false
    }

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error(
          'This SKU already exists. Please use a unique SKU.'
        )
      }

      throw new Error(error.message)
    }

    try {
      await recordInitialStock(
        data.id,
        draft.stockQuantity
      )
    } catch (stockError) {
      throw new Error(
        `Product "${draft.name}" was created successfully ` +
        `(ID: ${data.id}), but its initial stock could not ` +
        `be recorded. The product currently has zero stock. ` +
        `Please contact an administrator to reconcile ` +
        `the inventory. Details: ${stockError.message}`
      )
    }

    return { ...draft, id: data.id }
  },

  async deactivateProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .eq('is_active', true)
      .select('id')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  },
}

export const productsApi = supabase ? supabaseApi : sampleApi

// Product image upload configuration.
const PRODUCT_IMAGE_BUCKET = 'product-images'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function uploadProductImage(productId, file) {
  if (!supabase) {
    throw new Error(
      'Image uploads require a live Supabase connection.'
    )
  }

  if (
    !Number.isSafeInteger(Number(productId)) ||
    Number(productId) <= 0
  ) {
    throw new Error(
      'A valid saved product is required.'
    )
  }

  if (!file) {
    throw new Error('Please select an image.')
  }

  const extension = ALLOWED_IMAGE_TYPES[file.type]

  if (!extension) {
    throw new Error(
      'Only JPEG, PNG, and WebP images are allowed.'
    )
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      'Image size must not exceed 2 MiB.'
    )
  }

  const uniqueName = crypto.randomUUID()
  const filePath =
    `${productId}/${uniqueName}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(
      `Image upload failed: ${uploadError.message}`
    )
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({ photo_path: filePath })
    .eq('id', productId)
    .eq('is_active', true)
    .select('id')
    .single()

  if (updateError) {
    throw new Error(
      'Image uploaded, but the product record ' +
      'could not be updated. ' +
      `Storage path: ${filePath}. ` +
      `Details: ${updateError.message}`
    )
  }

  return filePath
}
