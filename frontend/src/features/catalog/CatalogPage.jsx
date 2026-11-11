
import { useEffect, useMemo, useState } from 'react'
import { catalogApi } from './catalogApi.js'
import { supabase } from '../../lib/supabase.js'
import './catalog.css'
import { Link } from 'react-router'
import { useAuth } from '../../app/auth.js'

function getProductImageUrl(photoPath) {
  if (!photoPath || !supabase) {
    return null
  }

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(photoPath)

  return data.publicUrl
}

function CatalogProductImage({ product }) {
  const imageUrl = getProductImageUrl(product.photoPath)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  if (!imageUrl || imageFailed) {
    return (
      <div className="catalog-image-placeholder" aria-hidden="true">
        <span>✦</span>
        <p>SJ Perfume Trading</p>
      </div>
    )
  }

  return (
    <div className="catalog-image-container">
      <img
        src={imageUrl}
        alt={`${product.name} perfume`}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    </div>
  )
}

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

function getUniqueOptions(products, field) {
  return [...new Set(
    products
      .map((product) => product[field]?.trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))
}

export default function CatalogPage() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedScentFamily, setSelectedScentFamily] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { status } = useAuth()

  useEffect(() => {
    let active = true

    async function loadCatalog() {
      try {
        const data = await catalogApi.listProducts()

        if (active) {
          setProducts(data)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      active = false
    }
  }, [])

  const brands = useMemo(
    () => getUniqueOptions(products, 'brand'),
    [products]
  )

  const scentFamilies = useMemo(
    () => getUniqueOptions(products, 'scentFamily'),
    [products]
  )

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.brand,
        product.scentFamily,
        product.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = searchable.includes(normalizedSearch)

      const matchesBrand =
        !selectedBrand || product.brand === selectedBrand

      const matchesScentFamily =
        !selectedScentFamily ||
        product.scentFamily === selectedScentFamily

      return (
        matchesSearch &&
        matchesBrand &&
        matchesScentFamily
      )
    })
  }, [products, search, selectedBrand, selectedScentFamily])

  const hasActiveFilters = Boolean(
    search.trim() || selectedBrand || selectedScentFamily
  )

  function clearFilters() {
    setSearch('')
    setSelectedBrand('')
    setSelectedScentFamily('')
  }

  return (
    <section className="catalog-page">
      <header className="catalog-header">
      {status !== 'signed-in' && (
        <div className="catalog-public-nav">
          <Link to="/" className="catalog-login-link">
            CMS Login
          </Link>
        </div>
      )}
        <p className="catalog-eyebrow">SJ Perfume Trading</p>

        <h1>Explore Our Fragrances</h1>

        <p>
          Discover fragrances for every mood and occasion.
          Browse our collection and find your next favorite scent.
        </p>
      </header>

      <div className="catalog-toolbar">
        <div className="catalog-filter-field">
          <label htmlFor="catalog-search">
            Search fragrances
          </label>

          <input
            id="catalog-search"
            type="search"
            placeholder="Search by name, brand, or scent..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="catalog-filter-field">
          <label htmlFor="catalog-brand-filter">
            Brand
          </label>

          <select
            id="catalog-brand-filter"
            value={selectedBrand}
            onChange={(event) =>
              setSelectedBrand(event.target.value)
            }
          >
            <option value="">All brands</option>

            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div className="catalog-filter-field">
          <label htmlFor="catalog-scent-filter">
            Scent family
          </label>

          <select
            id="catalog-scent-filter"
            value={selectedScentFamily}
            onChange={(event) =>
              setSelectedScentFamily(event.target.value)
            }
          >
            <option value="">All scent families</option>

            {scentFamilies.map((scentFamily) => (
              <option key={scentFamily} value={scentFamily}>
                {scentFamily}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="catalog-clear-filters"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Clear Filters
        </button>
      </div>

      {loading && (
        <p role="status">Loading fragrances...</p>
      )}

      {error && (
        <p className="catalog-error" role="alert">
          Unable to load catalog: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p className="catalog-count" role="status">
            Showing {filteredProducts.length} of {products.length} fragrances
          </p>

          {products.length === 0 ? (
            <div className="catalog-empty">
              <p>No fragrances are currently available in our Catalog.</p>
              <p>Please check back for new arrivals.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="catalog-empty">
              <p>No fragrances match your search or selected filters.</p>
              <p>Try another keyword, brand, or scent family.</p>

              <button
                type="button"
                className="catalog-clear-filters"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="catalog-grid">
              {filteredProducts.map((product) => (
                <article
                  className="catalog-card"
                  key={product.id}
                >
                  <CatalogProductImage product={product} />

                  <div className="catalog-card-content">
                    <p className="catalog-brand">
                      {product.brand}
                    </p>

                    <h2>{product.name}</h2>

                    <p className="catalog-details">
                      {product.scentFamily} · {product.sizeMl} mL
                    </p>

                    <p className="catalog-description">
                      {product.description || 'Discover this fragrance.'}
                    </p>

                    <div className="catalog-card-footer">
                      <strong>
                        {peso.format(product.retailPrice)}
                      </strong>

                      <span
                        className={`catalog-availability catalog-availability--${
                          product.availability
                            .toLowerCase()
                            .replaceAll(' ', '-')
                        }`}
                      >
                        {product.availability}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
