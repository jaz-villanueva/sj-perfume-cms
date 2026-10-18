
import { useState } from 'react'
import './products.css'

const sampleProducts = [
  {
    id: 1,
    sku: 'SAMPLE-001',
    name: 'Midnight Bloom',
    brand: 'Sample Brand A',
    scentFamily: 'Floral',
    sizeMl: 50,
    sellingPrice: 850,
    stockQuantity: 12,
    reorderLevel: 5,
  },
  {
    id: 2,
    sku: 'SAMPLE-002',
    name: 'Citrus Breeze',
    brand: 'Sample Brand B',
    scentFamily: 'Citrus',
    sizeMl: 30,
    sellingPrice: 550,
    stockQuantity: 3,
    reorderLevel: 5,
  },
  {
    id: 3,
    sku: 'SAMPLE-003',
    name: 'Velvet Woods',
    brand: 'Sample Brand C',
    scentFamily: 'Woody',
    sizeMl: 100,
    sellingPrice: 1200,
    stockQuantity: 0,
    reorderLevel: 5,
  },
  {
    id: 4,
    sku: 'SAMPLE-004',
    name: 'Ocean Mist',
    brand: 'Sample Brand A',
    scentFamily: 'Aquatic',
    sizeMl: 50,
    sellingPrice: 750,
    stockQuantity: 8,
    reorderLevel: 5,
  },
]

function getStockStatus(product) {
  if (product.stockQuantity === 0) {
    return 'Out of stock'
  }

  if (product.stockQuantity <= product.reorderLevel) {
    return 'Low stock'
  }

  return 'In stock'
}

const emptyProductForm = {
  sku: '',
  name: '',
  brand: '',
  scentFamily: '',
  sizeMl: '',
  sellingPrice: '',
  stockQuantity: '',
  reorderLevel: '5',
}

export default function ProductsPage() {
  const [products, setProducts] = useState(sampleProducts)
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState(emptyProductForm)
  const [formError, setFormError] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)

  function handleFormChange(event) {
    const { name, value } = event.target
    setFormData((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))
  }

  function handleEditProduct(product) {
    setEditingProductId(product.id)
    setFormData({
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      scentFamily: product.scentFamily,
      sizeMl: String(product.sizeMl),
      sellingPrice: String(product.sellingPrice),
      stockQuantity: String(product.stockQuantity),
      reorderLevel: String(product.reorderLevel),
    })

    setFormError('')
    setIsFormOpen(true)
  }
  
  function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    )

    if (!confirmed) {
      return
    }

    setProducts((previousProducts) =>
      previousProducts.filter(
        (existingProduct) => existingProduct.id !== product.id
      )
    )

    if (editingProductId === product.id) {
      setFormData(emptyProductForm)
      setEditingProductId(null)
      setFormError('')
      setIsFormOpen(false)
    }
  }

  function handleCreateProduct(event) {
    event.preventDefault()
    setFormError('')

    const sku = formData.sku.trim().toUpperCase()

    if (
      !sku ||
      !formData.name.trim() ||
      !formData.brand.trim() ||
      !formData.scentFamily.trim() ||
      !formData.sizeMl ||
      !formData.sellingPrice ||
      formData.stockQuantity === '' ||
      formData.reorderLevel === ''
    ) {
      setFormError('Please complete all required fields.')
      return
    }
    if (
      products.some(
        (product) =>
          product.id !== editingProductId &&
          product.sku.toUpperCase() === sku
      )
    ) {
      setFormError('This SKU already exists. Please use a unique SKU.')
      return
    }
    const sizeMl = Number(formData.sizeMl)
    const sellingPrice = Number(formData.sellingPrice)
    const stockQuantity = Number(formData.stockQuantity)
    const reorderLevel = Number(formData.reorderLevel)

    if (
      !Number.isFinite(sizeMl) ||
      sizeMl <= 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0 ||
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0 ||
      !Number.isInteger(reorderLevel) ||
      reorderLevel < 0 
    ) {
      setFormError('Enter a positive size, a non-negative price, and non-negative whole-number stock values.')
      return
    }

      const productData = {
        sku,
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        scentFamily: formData.scentFamily.trim(),
        sizeMl,
        sellingPrice,
        stockQuantity,
        reorderLevel,
      }

      if (editingProductId !== null) {
        // Update the existing product.
        setProducts((previousProducts) =>
          previousProducts.map((product) =>
            product.id === editingProductId
              ? { ...product, ...productData }
              : product
          )
        )
      } else {
        // Create a new product.
        const newProduct = {
          id: Math.max(0, ...products.map((product) => product.id)) + 1,
          ...productData,
        }

        setProducts((previousProducts) => [
          ...previousProducts,
          newProduct,
        ])
      
    }   

      setFormData(emptyProductForm)
      setEditingProductId(null)
      setIsFormOpen(false)
      setSearch('')

  }

  const filteredProducts = products.filter((product) => {
    const searchableText = [
      product.name,
      product.brand,
      product.sku,
      product.scentFamily,
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(search.trim().toLowerCase())
  })

  return (
    <section className="products-page">
      <div className="products-heading">
        <div>
          <h1>Products</h1>
          <p>Manage product information for SJ Perfume Trading.</p>
        </div>

        <div className="products-heading-actions">
          <span className="sample-label">Sample data</span>

          <button
            type="button"
            className="create-product-button"
            onClick={() => setIsFormOpen(!isFormOpen)}
          >
            {isFormOpen ? 'Cancel' : '+ Create Product'}

          </button>
        </div>

        <span className="sample-label">Sample data</span>
      </div>

      {isFormOpen && (
        <form className="product-form" onSubmit={handleCreateProduct}>
          <h2>{editingProductId !== null ? 'Edit Product' : 'Create Product'}</h2>
          <p>Enter the product details below. All fields are required.</p>

          <div className="product-form-grid">
            <label>
              SKU
              <input
                name="sku"
                value={formData.sku}
                onChange={handleFormChange}
                placeholder="e.g. SAMPLE-005"
                required
              />
            </label>

            <label>
              Product name
              <input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Enter product name"
                required
              />
            </label>

            <label>
              Brand
              <input
                name="brand"
                value={formData.brand}
                onChange={handleFormChange}
                placeholder="Enter brand"
                required
              />
            </label>

            <label>
              Scent family
              <input
                name="scentFamily"
                value={formData.scentFamily}
                onChange={handleFormChange}
                placeholder="e.g. Floral"
                required
              />
            </label>

            <label>
              Size (mL)
              <input
                name="sizeMl"
                type="number"
                min="0.01"
                step="any"
                value={formData.sizeMl}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Selling price (PHP)
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Initial stock quantity
              <input
                name="stockQuantity"
                type="number"
                min="0"
                step="1"
                value={formData.stockQuantity}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Reorder level
              <input
                name="reorderLevel"
                type="number"
                min="0"
                step="1"
                value={formData.reorderLevel}
                onChange={handleFormChange}
                required
              />
            </label>
          </div>

          {formError && (
            <p className="product-form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="product-form-actions">
            <button type="submit" className="create-product-button">
              {editingProductId !== null ? 'Update Product' : 'Save Product'}
            </button>

            <button
              type="button"
              className="cancel-product-button"
              onClick={() => {
                setFormData(emptyProductForm)
                setEditingProductId(null)
                setFormError('')
                setIsFormOpen(false)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="products-toolbar">
        <label htmlFor="product-search">Search products</label>
        <input
          id="product-search"
          type="search"
          placeholder="Search by name, brand, SKU, or scent..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <p className="products-count">
        Showing {filteredProducts.length} of {products.length} products
      </p>

      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">SKU</th>
              <th scope="col">Scent family</th>
              <th scope="col">Size</th>
              <th scope="col">Selling price</th>
              <th scope="col">Stock</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span className="product-brand">{product.brand}</span>
                </td>
                <td>{product.sku}</td>
                <td>{product.scentFamily}</td>
                <td>{product.sizeMl} mL</td>
                <td>
                  {product.sellingPrice.toLocaleString('en-PH', {
                    style: 'currency',
                    currency: 'PHP',
                  })}
                </td>
                <td>{product.stockQuantity}</td>
                <td>
                  <span
                    className={`stock-status stock-status--${getStockStatus(product)
                      .toLowerCase()
                      .replaceAll(' ', '-')}`}
                  >
                    {getStockStatus(product)}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleEditProduct(product)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="products-empty">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
