
import './inventory.css'
import { useEffect, useState } from 'react'
import { inventoryApi } from './inventoryApi.js'

const emptyMovementForm = {
  productId: '',
  kind: 'stock_in',
  quantity: '',
  reason: '',
  reference: '',
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [isMovementFormOpen, setIsMovementFormOpen] = useState(false)
  const [movementForm, setMovementForm] = useState(emptyMovementForm)
  const [movementError, setMovementError] = useState('')
  const [movementSuccess, setMovementSuccess] = useState('')
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false)
  const [movements, setMovements] = useState([])
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [movementsError, setMovementsError] = useState('')
  const [movementSearch, setMovementSearch] = useState('')
  const [movementTypeFilter, setMovementTypeFilter] = useState('all')
  const [movementDateFrom, setMovementDateFrom] = useState('')
  const [movementDateTo, setMovementDateTo] = useState('')

  
useEffect(() => {
  async function loadInventory() {
    try {
      const data = await inventoryApi.listInventory()
      setInventory(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMovements() {
    try {
      const data = await inventoryApi.listMovements()
      setMovements(data)
      console.log('Stock movement history:', data)
    } catch (err) {
      setMovementsError(err.message)
    } finally {
      setMovementsLoading(false)
    }
  }

  loadInventory()
  loadMovements()
}, [])


  
  
const filteredInventory = inventory.filter((item) => {
  const searchableText = [
    item.sku,
    item.name,
    item.brand,
  ]
    .join(' ')
    .toLowerCase()

  const matchesSearch = searchableText.includes(
    search.trim().toLowerCase()
  )

  const matchesStockFilter =
    stockFilter === 'all' || item.isLowStock

  return matchesSearch && matchesStockFilter
})


const filteredMovements = movements.filter((movement) => {
  const product = inventory.find(
    (item) => item.productId === movement.productId
  )

  const searchableText = [
    product?.sku,
    product?.name,
    movement.kind,
    movement.reason,
    movement.reference,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const matchesSearch = searchableText.includes(
    movementSearch.trim().toLowerCase()
  )

  
  const matchesMovementType =
    movementTypeFilter === 'all' ||
    movement.kind === movementTypeFilter

  const movementDate = new Date(movement.createdAt)

  const matchesDateFrom =
    !movementDateFrom ||
    movementDate >= new Date(`${movementDateFrom}T00:00:00`)

  const matchesDateTo =
    !movementDateTo ||
    movementDate < new Date(
      new Date(`${movementDateTo}T00:00:00`).getTime() +
      24 * 60 * 60 * 1000
    )


  return (
    matchesSearch &&
    matchesMovementType &&
    matchesDateFrom &&
    matchesDateTo
  )
})

function handleClearMovementFilters() {
  setMovementSearch('')
  setMovementTypeFilter('all')
  setMovementDateFrom('')
  setMovementDateTo('')
}


  function handleMovementChange(event) {
    const { name, value } = event.target

    setMovementForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))

    setMovementError('')
    setMovementSuccess('')
  }

  async function handleMovementSubmit(event) {
    event.preventDefault()

    setMovementError('')
    setMovementSuccess('')

    const productId = Number(movementForm.productId)
    const quantity = Number(movementForm.quantity)

    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setMovementError('Please select a valid product.')
      return
    }

    if (!Number.isSafeInteger(quantity) || quantity === 0) {
      setMovementError('Please enter a non-zero whole number.')
      return
    }

    if (movementForm.kind !== 'adjustment' && quantity < 0) {
      setMovementError('Stock-in and return quantities must be positive.')
      return
    }

    if (
      movementForm.kind === 'adjustment' &&
      !movementForm.reason.trim()
    ) {
      setMovementError('A reason is required for stock adjustments.')
      return
    }

    setIsSubmittingMovement(true)

    try {
      const result = await inventoryApi.recordMovement({
        productId,
        kind: movementForm.kind,
        quantity,
        reason: movementForm.reason.trim(),
        reference: movementForm.reference.trim(),
      })

      const updatedInventory = await inventoryApi.listInventory()
      setInventory(updatedInventory)

      try {
        const updatedMovements = await inventoryApi.listMovements()
        setMovements(updatedMovements)
        setMovementsError('')
      } catch (historyError) {
        setMovementsError(
          historyError.message || 'Unable to refresh stock movement history.'
        )
      }

      setMovementSuccess(
        `Stock movement recorded successfully. New stock balance: ${result.onHand}.`
      )

      setMovementForm(emptyMovementForm)
    } catch (err) {
      setMovementError(err.message || 'Unable to record stock movement.')
    } finally {
      setIsSubmittingMovement(false)
    }
  }


  return (
    <section className="inventory-page">
      <h1>Inventory Management</h1>

      <p>
        Monitor product stock levels and manage inventory records.
      </p>

      
      <div className="inventory-actions">
        <button
          type="button"
          className="inventory-primary-button"
          onClick={() => {
            setIsMovementFormOpen(!isMovementFormOpen)
            setMovementForm(emptyMovementForm)
            setMovementError('')
            setMovementSuccess('')
          }}
        >
          {isMovementFormOpen ? 'Cancel' : '+ Record Stock Movement'}
        </button>
      </div>

      
      {isMovementFormOpen && (
        <form
          className="inventory-movement-form"
          onSubmit={handleMovementSubmit}
        >
          <h2>Record Stock Movement</h2>

          <p>
            Select a product and enter the stock transaction details.
          </p>

          <div className="inventory-form-grid">
            <label>
              Product
              <select
                name="productId"
                value={movementForm.productId}
                onChange={handleMovementChange}
                required
              >
                <option value="">Select a product</option>

                {inventory.map((item) => (
                  <option key={item.productId} value={item.productId}>
                    {item.name} ({item.sku}) — {item.onHand} on hand
                  </option>
                ))}
                </select>
            </label>

            <label>
              Movement Type
              <select
                name="kind"
                value={movementForm.kind}
                onChange={handleMovementChange}
                required
              >
                <option value="stock_in">Stock In</option>
                <option value="return">Return</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </label>

            <label>
              Quantity
              <input
                type="number"
                name="quantity"
                value={movementForm.quantity}
                onChange={handleMovementChange}
                step="1"
                required
                placeholder="Enter quantity"
              />
              <small>
                Use a positive quantity for stock-in and returns.
                Adjustments may be positive or negative.
              </small>
            </label>

            <label>
              Reason
              <input
                type="text"
                name="reason"
                value={movementForm.reason}
                onChange={handleMovementChange}
                placeholder="e.g. Supplier delivery"
                required={movementForm.kind === 'adjustment'}
              />
            </label>

            <label>
              Reference (Optional)
              <input
                type="text"
                name="reference"
                value={movementForm.reference}
                onChange={handleMovementChange}
                placeholder="e.g. DEL-001"
              />
            </label>
          </div>

          {movementError && (
            <p className="inventory-form-error" role="alert">
              {movementError}
            </p>
          )}

          {movementSuccess && (
            <p className="inventory-form-success" role="status">
              {movementSuccess}
            </p>
          )}

          <div className="inventory-form-actions">
            <button
              type="submit"
              className="inventory-primary-button"
              disabled={isSubmittingMovement}
            >
              Record Movement
            </button>

            <button
              type="button"
              className="inventory-secondary-button"
              onClick={() => {
                setIsMovementFormOpen(false)
                setMovementForm(emptyMovementForm)
                setMovementError('')
                setMovementSuccess('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      
      <div className="inventory-toolbar">
        <label htmlFor="inventory-search">
        Search inventory
        </label>

        <input
          id="inventory-search"
          type="search"
          placeholder="Search by SKU, product name, or brand..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      
    <div className="inventory-filter">
      <label htmlFor="inventory-stock-filter">
        Stock status
      </label>

      <select
        id="inventory-stock-filter"
        value={stockFilter}
        onChange={(event) => setStockFilter(event.target.value)}
      >
        <option value="all">All Products</option>
        <option value="low">Low Stock & Out of Stock</option>
      </select>
    </div>


      <p className="inventory-count">
        Showing {filteredInventory.length} of {inventory.length} products
      </p>


      {loading && <p>Loading inventory...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th scope="col">SKU</th>
                <th scope="col">Product</th>
                <th scope="col">Brand</th>
                <th scope="col">On Hand</th>
                <th scope="col">Reorder Level</th>
                <th scope="col">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.productId}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.brand}</td>
                  <td>{item.onHand}</td>
                  <td>{item.reorderLevel}</td>
                  <td>
                    <span
                      className={`inventory-status ${
                        item.onHand === 0
                          ? 'inventory-status--out'
                          : item.isLowStock
                            ? 'inventory-status--low'
                            : 'inventory-status--normal'
                      }`}
                    >
                      {item.onHand === 0
                        ? 'Out of Stock'
                        : item.isLowStock
                          ? 'Low Stock'
                          : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="inventory-empty">
                    No inventory records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="inventory-history">
        <h2>Stock Movement History</h2>

        <p>
          Review previously recorded inventory transactions.
        </p>

        
        
<div className="inventory-toolbar">
  <label htmlFor="movement-history-search">
    Search stock movements
  </label>

  <input
    id="movement-history-search"
    type="search"
    placeholder="Search by SKU, product, reason, or reference..."
    value={movementSearch}
    onChange={(event) => setMovementSearch(event.target.value)}
  />
</div>

<div className="inventory-filter">
  <label htmlFor="movement-type-filter">
    Movement type
  </label>

  <select
    id="movement-type-filter"
    value={movementTypeFilter}
    onChange={(event) => setMovementTypeFilter(event.target.value)}
  >
    <option value="all">All Movements</option>
    <option value="stock_in">Stock In</option>
    <option value="return">Return</option>
    <option value="adjustment">Adjustment</option>
  </select>
</div>

<div className="inventory-filter">
  <label htmlFor="movement-date-from">
    From Date
  </label>

  <input
    id="movement-date-from"
    type="date"
    value={movementDateFrom}
    onChange={(event) => {
      const newFromDate = event.target.value
      setMovementDateFrom(newFromDate)

      if (
        newFromDate &&
        movementDateTo &&
        newFromDate > movementDateTo
      ) {
        setMovementDateTo('')
      }
    }}
  />
</div>

<div className="inventory-filter">
  <label htmlFor="movement-date-to">
    To Date
  </label>

  <input
    id="movement-date-to"
    type="date"
    value={movementDateTo}
    onChange={(event) => setMovementDateTo(event.target.value)}
    min={movementDateFrom || undefined}
  />
</div>

 
        <p className="inventory-count">
          Showing {filteredMovements.length} of {movements.length} stock movements
        </p>

        
        <div className="inventory-actions">
        <button
          type="button"
          className="inventory-secondary-button"
          onClick={handleClearMovementFilters}
        >
          Clear Filters
        </button>
      </div>


        {movementsLoading && (
          <p>Loading stock movement history...</p>
        )}

        {movementsError && (
          <p role="alert">{movementsError}</p>
        )}

        {!movementsLoading && !movementsError && (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th scope="col">Date & Time</th>
                  <th scope="col">Product</th>
                  <th scope="col">Movement Type</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Reference</th>
                </tr>
              </thead>

              <tbody>
                {filteredMovements.map((movement) => {
                  const product = inventory.find(
                    (item) => item.productId === movement.productId
                  )

                  return (
                    <tr key={movement.id}>
                      <td>
                        {new Date(movement.createdAt).toLocaleString()}
                      </td>

                      <td>
                        {product
                          ? `${product.name} (${product.sku})`
                          : `Product ID: ${movement.productId}`}
                      </td>

                      <td>
                        {movement.kind === 'stock_in'
                          ? 'Stock In'
                          : movement.kind === 'return'
                            ? 'Return'
                            : movement.kind === 'adjustment'
                              ? 'Adjustment'
                              : movement.kind}
                      </td>

                      <td>
                        {movement.quantity > 0
                          ? `+${movement.quantity}`
                          : movement.quantity}
                      </td>

                      <td>{movement.reason || '—'}</td>

                      <td>{movement.reference || '—'}</td>
                    </tr>
                  )
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="inventory-empty">
                      {movements.length === 0
                        ? 'No stock movements recorded yet.'
                        : 'No stock movements match your current filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
