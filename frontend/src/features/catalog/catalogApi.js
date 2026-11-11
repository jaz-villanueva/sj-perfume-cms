
import { supabase } from '../../lib/supabase.js'

export const catalogApi = {
  async listProducts() {
    if (!supabase) {
      throw new Error(
        'Catalog is unavailable because Supabase is not configured.'
      )
    }

    const { data, error } = await supabase
      .from('public_catalog')
      .select(`
        id,
        name,
        brand,
        scent_family,
        size_ml,
        description,
        retail_price,
        photo_path,
        availability
      `)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return (data ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      scentFamily: product.scent_family,
      sizeMl: product.size_ml,
      description: product.description ?? '',
      retailPrice: Number(product.retail_price),
      photoPath: product.photo_path,
      availability: product.availability,
    }))
  },
}
