import { describe, expect, it } from 'vitest'
import { calculateRacePayout, purchaseVehicle, VEHICLE_PRICES, purchasePaint, PAINT_OPTIONS, purchaseWheels, purchaseTint, purchaseSpoiler, purchaseSuspension, purchaseExhaust, purchaseHeadlights } from './economy'

describe('race economy', () => {
  it('rewards distance in complete 100 m blocks', () => {
    expect(calculateRacePayout(299, 0)).toEqual({ credits: 10, distanceCredits: 10, nearMissCredits: 0 })
  })

  it('adds a bonus for each near miss', () => {
    expect(calculateRacePayout(1000, 3)).toEqual({ credits: 95, distanceCredits: 50, nearMissCredits: 45 })
  })

  it('never pays for negative or invalid values', () => {
    expect(calculateRacePayout(-500, -2)).toEqual({ credits: 0, distanceCredits: 0, nearMissCredits: 0 })
    expect(calculateRacePayout(Number.NaN, Number.POSITIVE_INFINITY).credits).toBe(0)
  })
})


describe('vehicle unlock economy', () => {
  it('charges the configured price and unlocks the selected vehicle', () => {
    const result = purchaseVehicle(600, ['gol-g5'], 'palio')
    expect(result).toEqual({
      success: true,
      reason: 'purchased',
      balance: 50,
      unlockedVehicles: ['gol-g5', 'palio'],
    })
  })

  it('does not charge when the player cannot afford a vehicle', () => {
    const result = purchaseVehicle(399, ['gol-g5'], 'uno')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('insufficient-credits')
    expect(result.balance).toBe(399)
    expect(result.unlockedVehicles).toEqual(['gol-g5'])
  })

  it('does not charge twice for an already owned vehicle', () => {
    const result = purchaseVehicle(1000, ['gol-g5', 'uno'], 'uno')
    expect(result.success).toBe(false)
    expect(result.reason).toBe('already-owned')
    expect(result.balance).toBe(1000)
  })

  it('keeps the starter car free and all other prices positive', () => {
    expect(VEHICLE_PRICES['gol-g5']).toBe(0)
    expect(Object.entries(VEHICLE_PRICES).filter(([id]) => id !== 'gol-g5' && id !== 'supercar' && id !== 'sedan' && id !== 'cutlass').every(([, price]) => price > 0)).toBe(true)
  })
})


describe('paint customization economy', () => {
  it('purchases a paint and deducts its price', () => {
    const red = PAINT_OPTIONS.find(item => item.id === '#d71920')!
    const result = purchasePaint(200, ['#4a5052'], red.id)
    expect(result.success).toBe(true)
    expect(result.balance).toBe(20)
    expect(result.unlockedPaints).toContain(red.id)
  })
  it('does not charge twice or allow an unaffordable paint', () => {
    expect(purchasePaint(500, ['#4a5052', '#d71920'], '#d71920').reason).toBe('already-owned')
    const result = purchasePaint(100, ['#4a5052'], '#d71920')
    expect(result.reason).toBe('insufficient-credits')
    expect(result.balance).toBe(100)
  })
  it('keeps the starter paint free', () => {
    expect(PAINT_OPTIONS[0].price).toBe(0)
  })
})


describe('wheel and tint accessory economy', () => {
  it('unlocks wheels and tint with credits', () => {
    expect(purchaseWheels(300, ['alloy'], 'black')).toMatchObject({ success: true, balance: 40 })
    expect(purchaseTint(200, ['smoke'], 'light')).toMatchObject({ success: true, balance: 20 })
  })
  it('prevents duplicate and unaffordable accessory purchases', () => {
    expect(purchaseWheels(1000, ['alloy', 'black'], 'black').reason).toBe('already-owned')
    expect(purchaseTint(10, ['smoke'], 'dark').reason).toBe('insufficient-credits')
  })
})

describe('spoiler and suspension economy', () => {
 it('purchases exterior upgrades', () => {expect(purchaseSpoiler(700,['none'],'street')).toMatchObject({success:true,balance:20});expect(purchaseSuspension(650,['stock'],'lowered')).toMatchObject({success:true,balance:50})})
 it('blocks duplicate and unaffordable upgrades', () => {expect(purchaseSpoiler(1000,['none','street'],'street').reason).toBe('already-owned');expect(purchaseSuspension(200,['stock'],'slammed').reason).toBe('insufficient-credits')})
})


describe('exhaust and headlight economy', () => {
 it('purchases sport exhaust and xenon headlights', () => { expect(purchaseExhaust(500,['stock'],'sport')).toMatchObject({success:true,balance:80}); expect(purchaseHeadlights(600,['halogen'],'xenon')).toMatchObject({success:true,balance:150}) })
 it('blocks duplicate, unaffordable and unknown upgrades', () => { expect(purchaseExhaust(900,['stock','sport'],'sport').reason).toBe('already-owned'); expect(purchaseHeadlights(100,['halogen'],'led').reason).toBe('insufficient-credits'); expect(purchaseHeadlights(1000,['halogen'],'laser').success).toBe(false) })
})
