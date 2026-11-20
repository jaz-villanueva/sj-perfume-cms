
import { supabase } from '../../lib/supabase.js'

const SAMPLE_RESELLERS = [
  {
    id: 1,
    businessName: 'Scents by Mia',
    contactPerson: 'Mia',
    mobile: '',
    email: '',
    address: '',
    priceTier: 'standard',
    status: 'active',
    consentAt: null,
    createdAt: '2026-10-14T00:00:00Z',
    updatedAt: '2026-10-14T00:00:00Z',
  },
  {
    id: 2,
    businessName: 'Aroma Corner QC',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    priceTier: 'standard',
    status: 'active',
    consentAt: null,
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  },
]

let sampleResellers = []
let nextId = 1

export function resetSampleResellers() {
  sampleResellers = structuredClone(SAMPLE_RESELLERS)
  nextId = sampleResellers.length + 1
}

resetSampleResellers()

function normalizeReseller(row) {
  return {
    id: row.id,
    businessName: row.business_name,
    contactPerson: row.contact_person ?? '',
    mobile: row.mobile ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    priceTier: row.price_tier,
    status: row.status,
    consentAt: row.consent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDatabasePayload(reseller) {
  return {
    business_name: reseller.businessName.trim(),
    contact_person: reseller.contactPerson?.trim() || null,
    mobile: reseller.mobile?.trim() || null,
    email: reseller.email?.trim() || null,
    address: reseller.address?.trim() || null,
    price_tier: reseller.priceTier || 'standard',
    status: reseller.status || 'active',
    consent_at: reseller.consentAt || null,
  }
}

function validateReseller(reseller) {
  if (!reseller.businessName?.trim()) {
    throw new Error('Business name is required.')
  }

  if (!['active', 'inactive'].includes(reseller.status)) {
    throw new Error('Invalid reseller status.')
  }

  const hasContactDetails = [
    reseller.contactPerson,
    reseller.mobile,
    reseller.email,
    reseller.address,
  ].some((value) => Boolean(value?.trim()))

  if (hasContactDetails && !reseller.consentAt) {
    throw new Error(
      'Record consent before saving personal contact details.'
    )
  }
}

function fail(error) {
  throw new Error(error.hint || error.message)
}

const sampleApi = {
  isSample: true,

  async listResellers() {
    return structuredClone(sampleResellers)
      .sort((a, b) => a.businessName.localeCompare(b.businessName))
  },

  async createReseller(reseller) {
    validateReseller(reseller)

    const now = new Date().toISOString()

    const record = {
      ...reseller,
      id: nextId++,
      createdAt: now,
      updatedAt: now,
    }

    sampleResellers.push(record)

    return structuredClone(record)
  },

  async updateReseller(id, reseller) {
    validateReseller(reseller)

    const index = sampleResellers.findIndex(
      (record) => record.id === id
    )

    if (index === -1) {
      throw new Error('Reseller not found.')
    }

    sampleResellers[index] = {
      ...sampleResellers[index],
      ...reseller,
      id,
      updatedAt: new Date().toISOString(),
    }

    return structuredClone(sampleResellers[index])
  },

  async listResellerSales(_resellerId) {
    return []
  },
}

const supabaseApi = {
  isSample: false,

  async listResellers() {
    const { data, error } = await supabase
      .from('resellers')
      .select(
        'id, business_name, contact_person, mobile, email, address, price_tier, status, consent_at, created_at, updated_at'
      )
      .order('business_name')

    if (error) fail(error)

    return data.map(normalizeReseller)
  },

  async createReseller(reseller) {
    validateReseller(reseller)

    const { data, error } = await supabase
      .from('resellers')
      .insert(toDatabasePayload(reseller))
      .select()
      .single()

    if (error) fail(error)

    return normalizeReseller(data)
  },

  async updateReseller(id, reseller) {
    validateReseller(reseller)

    const { data, error } = await supabase
      .from('resellers')
      .update(toDatabasePayload(reseller))
      .eq('id', id)
      .select()
      .single()

    if (error) fail(error)

    return normalizeReseller(data)
  },

  async listResellerSales(resellerId) {
    const { data, error } = await supabase
      .from('sales')
      .select(
        'id, sale_no, sold_at, channel, reseller_id, total, status'
      )
      .eq('reseller_id', resellerId)
      .eq('channel', 'reseller')
      .order('sold_at', { ascending: false })

    if (error) fail(error)

    return data.map((sale) => ({
      id: sale.id,
      saleNo: sale.sale_no,
      soldAt: sale.sold_at,
      total: Number(sale.total),
      status: sale.status,
    }))
  },
}

export const resellersApi = supabase ? supabaseApi : sampleApi
