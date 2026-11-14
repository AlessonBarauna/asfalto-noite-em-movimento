/** Economy rules are pure so payouts can be tested independently from rendering. */
export type RacePayout = { credits: number; distanceCredits: number; nearMissCredits: number }

/** Five credits per 100 m, plus 15 for each clean near miss. */
export function calculateRacePayout(distanceMeters: number, nearMisses: number): RacePayout {
  const distanceCredits = Math.floor(Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0) / 100) * 5
  const nearMissCredits = Math.max(0, Math.floor(Number.isFinite(nearMisses) ? nearMisses : 0)) * 15
  return { credits: distanceCredits + nearMissCredits, distanceCredits, nearMissCredits }
}
