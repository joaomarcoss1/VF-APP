import { describe, expect, it } from 'vitest'
import { deliveryMapsUrl } from '@/services/entregas'

describe('VF Nexus Entregas', () => {
  it('gera rota Google Maps com endereço textual', () => {
    const url = deliveryMapsUrl({ delivery_address: 'Rua A, 123', delivery_city: 'Codó', delivery_state: 'MA', delivery_lat: null, delivery_lng: null } as any)
    expect(url).toContain('google.com/maps/dir')
    expect(url).toContain('Rua%20A')
  })

  it('gera rota Google Maps com latitude e longitude', () => {
    const url = deliveryMapsUrl({ delivery_address: '', delivery_city: '', delivery_state: '', delivery_lat: -4.45, delivery_lng: -43.88 } as any)
    expect(url).toContain('-4.45%2C-43.88')
  })
})
