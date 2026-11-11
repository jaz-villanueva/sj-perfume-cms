
import { useEffect, useState } from 'react'
import { productsApi, uploadProductImage } from './productsApi.js'
import './products.css'

function getStockStatus(product) {
  if (product.stockQuantity === 0) return 'Out of stock'
  if (product.stockQuantity <= product.reorderLevel) return 'Low stock'
  return 'In stock'
}

const emptyProductForm = {
  sku: '',
  name: '',
  brand: '',
  scentFamily: '',
  sizeMl: '',
  sellingPrice: '',
  resellerPrice: '',
  stockQuantity: '',
  reorderLevel: '5',
  description: '',
  showInCatalog: false,
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState(emptyProductForm)
  const [formError, setFormError] = useState('')
  const [editingProductId, setEditingProductId] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [pendingImageProductId, setPendingImageProductId] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadProducts() {
      try {
        const data = await productsApi.listProducts()
        if (active) setProducts(data)
      } catch (error) {
        if (active) setFormError(error.message)
      }
    }

    loadProducts()
    return () => { active = false }
  }, [])

  function resetForm() {
    setFormData(emptyProductForm)
    setEditingProductId(null)
    setSelectedImage(null)
    setPendingImageProductId(null)
    setFileInputKey((key) => key + 1)
    setFormError('')
    setIsFormOpen(false)
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target

    setFormData((previousForm) => ({
      ...previousForm,
      [name]: type === 'checkbox' ? checked : value,
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
      resellerPrice: String(product.resellerPrice ?? ''),
      stockQuantity: String(product.stockQuantity),
      reorderLevel: String(product.reorderLevel),
      description: product.description ?? '',
      showInCatalog: product.showInCatalog === true,
    })

    setSelectedImage(null)
    setPendingImageProductId(null)
    setFileInputKey((key) => key + 1)
    setFormError('')
    setUploadMessage('')
    setIsFormOpen(true)
  }

  async function handleDeleteProduct(product) {
    if (isSaving) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    )

    if (!confirmed) return

    try {
      await productsApi.deactivateProduct(product.id)

      const updatedProducts = await productsApi.listProducts()
      setProducts(updatedProducts)

      if (editingProductId === product.id) resetForm()

      setUploadMessage('')
    } catch (error) {
      setFormError(error.message)
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault()
    if (isSaving) return

    setFormError('')
    setUploadMessage('')

    const sku = formData.sku.trim().toUpperCase()

    if (
      !sku ||
      !formData.name.trim() ||
      !formData.brand.trim() ||
      !formData.scentFamily.trim() ||
      formData.sizeMl === '' ||
      formData.sellingPrice === '' ||
      formData.resellerPrice === '' ||
      formData.stockQuantity === '' ||
      formData.reorderLevel === ''
    ) {
      setFormError('Please complete all required fields.')
      return
    }

    if (products.some((product) =>
      product.id !== editingProductId &&
      product.sku.toUpperCase() === sku
    )) {
      setFormError(
        'This SKU already exists. Please use a unique SKU.'
      )
      return
    }

    const sizeMl = Number(formData.sizeMl)
    const sellingPrice = Number(formData.sellingPrice)
    const resellerPrice = Number(formData.resellerPrice)
    const stockQuantity = Number(formData.stockQuantity)
    const reorderLevel = Number(formData.reorderLevel)

    if (
      !Number.isFinite(sizeMl) || sizeMl <= 0 ||
      !Number.isFinite(sellingPrice) || sellingPrice < 0 ||
      !Number.isFinite(resellerPrice) || resellerPrice < 0 ||
      !Number.isInteger(stockQuantity) || stockQuantity < 0 ||
      !Number.isInteger(reorderLevel) || reorderLevel < 0
    ) {
      setFormError(
        'Enter a positive size, non-negative selling and ' +
        'reseller prices, and non-negative whole-number stock values.'
      )
      return
    }

    const description = formData.description.trim()

    if (description.length > 1000) {
      setFormError(
        'Product description must not exceed 1000 characters.'
      )
      return
    }

    if (selectedImage) {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ]

      if (!allowedTypes.includes(selectedImage.type)) {
        setFormError(
          'Only JPEG, PNG, and WebP images are allowed.'
        )
        return
      }

      if (selectedImage.size > 2 * 1024 * 1024) {
        setFormError('Image size must not exceed 2 MiB.')
        return
      }
    }

    const productData = {
      sku,
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      scentFamily: formData.scentFamily.trim(),
      sizeMl,
      sellingPrice,
      resellerPrice,
      stockQuantity,
      reorderLevel,
      description,
      showInCatalog: formData.showInCatalog === true,
    }

    setIsSaving(true)

    try {
      // Retry a failed image upload without saving
      // or creating the product a second time.
      let productId = pendingImageProductId

      if (productId == null) {
        const savedProduct = await productsApi.saveProduct({
          ...productData,
          id: editingProductId,
        })

        productId = savedProduct.id
      }

      if (selectedImage) {
        try {
          await uploadProductImage(productId, selectedImage)
        } catch (imageError) {
          setPendingImageProductId(productId)

          setFormError(
            'Product information was saved, but the image ' +
            `upload failed: ${imageError.message}. ` +
            'You can retry the image upload.'
          )

          const updatedProducts = await productsApi.listProducts()
          setProducts(updatedProducts)
          return
        }
      }

      const updatedProducts = await productsApi.listProducts()
      setProducts(updatedProducts)

      const hadImage = Boolean(selectedImage)

      resetForm()
      setSearch('')

      setUploadMessage(
        hadImage
          ? 'Product saved and image uploaded successfully.'
          : 'Product saved successfully.'
      )
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const searchableText = [
      product.name,
      product.brand,
      product.sku,
      product.scentFamily,
    ].join(' ').toLowerCase()

    return searchableText.includes(
      search.trim().toLowerCase()
    )
  })

  return (
    <section className="products-page">
      <div className="products-heading">
        <div>
          <h1>Products</h1>
          <p>
            Manage product information for SJ Perfume Trading.
          </p>
        </div>

        <div className="products-heading-actions">
          {productsApi.isSample && (
            <span className="sample-label">Sample data</span>
          )}

          <button
            type="button"
            className="create-product-button"
            disabled={isSaving}
            onClick={() => {
              if (isFormOpen) {
                resetForm()
              } else {
                resetForm()
                setUploadMessage('')
                setIsFormOpen(true)
              }
            }}
          >
            {isFormOpen ? 'Cancel' : '+ Create Product'}
          </button>
        </div>
      </div>

      {uploadMessage && (
        <p className="product-upload-success" role="status">
          {uploadMessage}
        </p>
      )}

      {!isFormOpen && formError && (
        <p className="product-form-error" role="alert">
          {formError}
        </p>
      )}

      {isFormOpen && (
        <form
          className="product-form"
          onSubmit={handleCreateProduct}
        >
          <h2>
            {editingProductId !== null
              ? 'Edit Product'
              : 'Create Product'}
          </h2>

          <p>
            Enter the required product details below.
            Catalog information and product images are optional.
          </p>

          <div className="product-form-grid">
            <label>
              SKU
              <input
                name="sku"
                value={formData.sku}
                onChange={handleFormChange}
                placeholder="e.g. SAMPLE-005"
                required
                disabled={pendingImageProductId != null}
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
                disabled={pendingImageProductId != null}
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
                disabled={pendingImageProductId != null}
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
                disabled={pendingImageProductId != null}
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
                disabled={pendingImageProductId != null}
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
                disabled={pendingImageProductId != null}
              />
            </label>

            <label>
              Reseller Price (₱)
              <input
                name="resellerPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.resellerPrice}
                onChange={handleFormChange}
                required
                disabled={pendingImageProductId != null}
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
                disabled={
                  editingProductId !== null ||
                  pendingImageProductId != null
                }
                required
              />

              {editingProductId !== null && (
                <small>
                  Stock quantities must be updated through
                  Inventory Management.
                </small>
              )}
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
                disabled={pendingImageProductId != null}
              />
            </label>
          </div>

          <div className="product-image-field">
            <label htmlFor="product-description">
              Product description (optional)
            </label>

            <textarea
              id="product-description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Describe the fragrance, scent notes, or product features..."
              rows={4}
              maxLength={1000}
              disabled={pendingImageProductId != null}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                font: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />

            <small>
              {formData.description.length}/1000 characters.
              This description will appear in the public Catalog
              when the product is published.
            </small>
          </div>

          <div className="product-image-field">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                name="showInCatalog"
                checked={formData.showInCatalog}
                onChange={handleFormChange}
                disabled={pendingImageProductId != null}
                style={{
                  width: '18px',
                  height: '18px',
                  flexShrink: 0,
                }}
              />
              Show in Public Catalog
            </label>

            <small>
              When enabled, this active product will be visible
              to public Catalog visitors. When disabled, the
              product remains in the internal Products module
              but is hidden from the Catalog.
            </small>
          </div>

          <div className="product-image-field">
            <label htmlFor="product-image">
              Product image (optional)
            </label>

            <input
              key={fileInputKey}
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isSaving}
              onChange={(event) => {
                setSelectedImage(
                  event.target.files?.[0] ?? null
                )
                setFormError('')
              }}
            />

            <small>
              JPEG, PNG, or WebP. Maximum file size: 2 MiB.
              Images appear in the public Catalog when
              the product is published.
            </small>
          </div>

          {formError && (
            <p
              className="product-form-error"
              role="alert"
            >
              {formError}
            </p>
          )}

          <div className="product-form-actions">
            <button
              type="submit"
              className="create-product-button"
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving...'
                : pendingImageProductId != null
                  ? 'Retry Image Upload'
                  : editingProductId !== null
                    ? 'Update Product'
                    : 'Save Product'}
            </button>

            <button
              type="button"
              className="cancel-product-button"
              disabled={isSaving}
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="products-toolbar">
        <label htmlFor="product-search">
          Search products
        </label>

        <input
          id="product-search"
          type="search"
          placeholder="Search by name, brand, SKU, or scent..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
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
              <th scope="col">Catalog Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span className="product-brand">
                    {product.brand}
                  </span>
                </td>

                <td>{product.sku}</td>
                <td>{product.scentFamily}</td>
                <td>{product.sizeMl} mL</td>

                <td>
                  {product.sellingPrice.toLocaleString(
                    'en-PH',
                    {
                      style: 'currency',
                      currency: 'PHP',
                    }
                  )}
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
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '5px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: product.showInCatalog
                        ? '#e7f4e9'
                        : '#f1f1f1',
                      color: product.showInCatalog
                        ? '#256c3a'
                        : '#666',
                    }}
                  >
                    {product.showInCatalog
                      ? 'Published'
                      : 'Hidden'}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    className="link"
                    disabled={isSaving}
                    onClick={() =>
                      handleEditProduct(product)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="deleteLink"
                    disabled={isSaving}
                    onClick={() =>
                      handleDeleteProduct(product)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="products-empty"
                >
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
