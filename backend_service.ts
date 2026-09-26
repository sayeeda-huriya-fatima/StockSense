import { createClient } from '@supabase/supabase-js';

export interface InventoryServiceConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

export class StockSenseEngine {
  private client: any;

  constructor(config: InventoryServiceConfig) {
    this.client = createClient(config.supabaseUrl, config.serviceRoleKey);
  }

  async fetchPhysicalStockOnHand(productId: string, locationId: string): Promise<number> {
    const { data, error } = await this.client.rpc('get_current_stock', {
      p_product_id: productId,
      p_location_id: locationId
    });
    if (error) throw new Error(`Stock fetch error: ${error.message}`);
    return Number(data || 0);
  }
}
