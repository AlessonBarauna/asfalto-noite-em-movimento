import './styles/race-game.css'
import { Audio } from './engine/audio'
import { Input } from './engine/input'
import { GameLoop } from './engine/loop'
import { Renderer, suggestQuality } from './engine/renderer'
import { SAVE_KEY, SaveStore, insertScore, type PlayerVehicleId } from './engine/save'
import { preloadSupercar } from './game/supercar'
import type { ScenarioId } from './game/scenarios'
import { RaceGame, type RaceResult } from './game/race-game'
import { POWERS, buyPowerUpgrade } from './game/powers'
import { applyRun, contractLive, deliverContract, describeObjective, generateObjective, isUnlocked, buyCity, buyCountry, cityById, cityMultiplier, countryById, countryOfCity, rankLevel, rankLabel, requiredRank, vehicleUnlockId, xpForRun, type Contract, type RunSummary } from './game/career'
import { calculateRacePayout, purchaseVehicle as buyVehicle, purchasePaint as buyPaint, purchaseWheels as buyWheels, purchaseTint as buyTint, purchaseSpoiler as buySpoiler, purchaseSuspension as buySuspension, purchaseExhaust as buyExhaust, purchaseHeadlights as buyHeadlights } from './game/economy'
import { tuning } from './game/tuning'
import { TouchControls } from './ui/touch'
import { RaceUI } from './ui/race-ui'

const CRASH_SOUND_URL = '/manus-storage/game/sha256/fff994e3eeaa9569d79a9f66884042305335a37ebcae45c8e9f4548b08a7d5e9.wav'
const ENGINE_SOUND_URL = '/manus-storage/game/sha256/037adf851d82c7e13e843b38fe0b95ba0a8b64d7f61cff3ce3e81dbb6dc866a2.ogg'
let activeUI: RaceUI | undefined

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game')
  const root = document.querySelector<HTMLElement>('#ui')
  if (!canvas || !root) throw new Error('Canvas ou camada de interface indisponível')

  const firstRun = safeGet(SAVE_KEY) === null && safeGet('asfalto.save.v7') === null && safeGet('asfalto.save.v6') === null && safeGet('asfalto.save.v5') === null && safeGet('asfalto.save.v4') === null && safeGet('asfalto.save.v3') === null && safeGet('asfalto.save.v2') === null && safeGet('asfalto.save.v1') === null
  const save = new SaveStore()
  if (firstRun) save.update({ quality: suggestQuality() })
  const input = new Input(canvas)
  const audio = new Audio()
  const ui = new RaceUI(root, {
    start: () => startRun(),
    updateName: name => save.update({ playerName: name }),
    pause: () => pauseRun(),
    resume: () => resumeRun(),
    restart: () => startRun(),
    toTitle: () => { bankRun(); game?.toTitle(); showTitleScreen() },
    openWorld: () => renderWorld(),
    selectCity: id => { if (travelTo(id)) renderWorld() },
    buyCountry: id => {
      const result = buyCountry(save.data.credits, save.data.world, id, careerRank())
      if (!result.success) { ui.toast(travelMessage(result.reason, id)); return }
      save.update({ credits: result.balance, world: result.world })
      ui.toast(`PASSAGEM COMPRADA · ${countryById(id)?.name.toUpperCase()}`)
      renderWorld()
    },
    buyCity: id => {
      const result = buyCity(save.data.credits, save.data.world, id, careerRank())
      if (!result.success) { ui.toast(travelMessage(result.reason, id)); return }
      save.update({ credits: result.balance, world: result.world })
      ui.toast(`PASSAGEM COMPRADA · ${cityById(id)?.name.toUpperCase()}`)
      renderWorld()
    },
    setSensitivity: value => { save.update({ sensitivity: value }); input.sensitivity = save.data.sensitivity; ui.setSensitivity(save.data.sensitivity) },
    openLeaderboard: () => { ui.showLeaderboard(save.data.leaderboard) },
    toggleSound: () => {
      save.update({ muted: !save.data.muted })
      applySettings()
      ui.setSound(!save.data.muted)
      if (!save.data.muted) audio.unlock()
    },
    openPowers: () => ui.showPowers(save.data.powerLevels, save.data.credits),
    purchasePower: id => {
      const result = buyPowerUpgrade(save.data.credits, save.data.powerLevels, id)
      if (!result.success) { ui.toast(result.reason === 'max-level' ? 'NÍVEL MÁXIMO' : 'CRÉDITOS INSUFICIENTES'); return }
      save.update({ credits: result.balance, powerLevels: result.levels })
      game?.setPowerLevels(result.levels)
      ui.toast(`${POWERS[id].label} EVOLUÍDO · NÍVEL ${result.levels[id]}`)
      ui.showPowers(result.levels, result.balance)
    },
    openGarage: () => { ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    selectVehicle: model => {
      if (!save.data.unlockedVehicles.includes(model)) return
      save.update({ playerVehicle: model })
      game?.setPlayerVehicle(model, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(model, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
    },
    purchaseVehicle: model => {
      const purchase = buyVehicle(save.data.credits, save.data.unlockedVehicles, model, careerRank())
      if (!purchase.success) {
        ui.toast(purchase.reason === 'already-owned' ? 'VEÍCULO JÁ DESBLOQUEADO' : purchase.reason === 'rank-locked' ? `REQUER PATENTE ${requiredRank(vehicleUnlockId(model))}` : 'CRÉDITOS INSUFICIENTES')
        return false
      }
      save.update({ credits: purchase.balance, unlockedVehicles: purchase.unlockedVehicles })
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
      ui.toast('VEÍCULO DESBLOQUEADO')
      return true
    },
    selectPaint: paint => {
      if (!save.data.unlockedPaints.includes(paint)) return
      save.update({ playerPaint: paint })
      game?.setPlayerVehicle(save.data.playerVehicle, paint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
    },
    purchasePaint: paint => { if (rankGate('garage-paint')) return false;
      const purchase = buyPaint(save.data.credits, save.data.unlockedPaints, paint)
      if (!purchase.success) {
        ui.toast(purchase.reason === 'already-owned' ? 'PINTURA JÁ DESBLOQUEADA' : 'CRÉDITOS INSUFICIENTES')
        return false
      }
      save.update({ credits: purchase.balance, unlockedPaints: purchase.unlockedPaints, playerPaint: paint })
      game?.setPlayerVehicle(save.data.playerVehicle, paint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
      ui.toast('PINTURA COMPRADA E APLICADA')
      return true
    },
    selectWheels: id => {
      if (!save.data.unlockedWheels.includes(id)) return
      save.update({ playerWheels: id })
      game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, id, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
    },
    purchaseWheels: id => { if (rankGate('garage-paint')) return false;
      const result = buyWheels(save.data.credits, save.data.unlockedWheels, id)
      if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'RODA JÁ DESBLOQUEADA' : 'CRÉDITOS INSUFICIENTES'); return false }
      save.update({ credits: result.balance, unlockedWheels: result.unlocked, playerWheels: id })
      game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, id, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
      ui.toast('RODAS COMPRADAS E APLICADAS'); return true
    },
    selectTint: id => {
      if (!save.data.unlockedTints.includes(id)) return
      save.update({ playerTint: id })
      game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, id, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
    },
    purchaseTint: id => { if (rankGate('garage-tint')) return false;
      const result = buyTint(save.data.credits, save.data.unlockedTints, id)
      if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'INSULFILM JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES'); return false }
      save.update({ credits: result.balance, unlockedTints: result.unlocked, playerTint: id })
      game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, id, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
      ui.toast('INSULFILM COMPRADO E APLICADO'); return true
    },
    selectSpoiler: id => { if (!save.data.unlockedSpoilers.includes(id)) return; save.update({ playerSpoiler: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, id, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    purchaseSpoiler: id => { if (rankGate('garage-tint')) return false; const result = buySpoiler(save.data.credits, save.data.unlockedSpoilers, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'AEROFÓLIO JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedSpoilers: result.unlocked, playerSpoiler: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, id, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights); ui.toast('AEROFÓLIO COMPRADO E INSTALADO'); return true },
    selectSuspension: id => { if (!save.data.unlockedSuspensions.includes(id)) return; save.update({ playerSuspension: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, id, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    purchaseSuspension: id => { if (rankGate('garage-performance')) return false; const result = buySuspension(save.data.credits, save.data.unlockedSuspensions, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'SUSPENSÃO JÁ DESBLOQUEADA' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedSuspensions: result.unlocked, playerSuspension: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, id, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights); ui.toast('SUSPENSÃO COMPRADA E INSTALADA'); return true },
    selectExhaust: id => { if (!save.data.unlockedExhausts.includes(id)) return; save.update({ playerExhaust: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, id, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, id, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    purchaseExhaust: id => { if (rankGate('garage-performance')) return false; const result = buyExhaust(save.data.credits, save.data.unlockedExhausts, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'ESCAPAMENTO JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedExhausts: result.unlocked, playerExhaust: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, id, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, id, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights); ui.toast('ESCAPAMENTO COMPRADO E INSTALADO'); return true },
    selectHeadlights: id => { if (!save.data.unlockedHeadlights.includes(id)) return; save.update({ playerHeadlights: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, id); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, id, save.data.unlockedHeadlights) },
    purchaseHeadlights: id => { if (rankGate('garage-performance')) return false; const result = buyHeadlights(save.data.credits, save.data.unlockedHeadlights, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'FARÓIS JÁ DESBLOQUEADOS' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedHeadlights: result.unlocked, playerHeadlights: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, id); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, id, save.data.unlockedHeadlights); ui.toast('FARÓIS COMPRADOS E INSTALADOS'); return true },
  })
  activeUI = ui
  const applySettings = () => audio.setVolumes(save.data.musicVolume, save.data.sfxVolume, save.data.muted)
  applySettings()

  let game: RaceGame | undefined
  let loop: GameLoop | undefined
  let resultHandled = false
  let lastLevel = 1
  let crashSound: AudioBuffer | undefined
  let engineSound: AudioBuffer | undefined

  function bestScore(): number {
    return save.data.leaderboard[0]?.score ?? 0
  }
  /** Parcial já pago da corrida em andamento (créditos e metros), para não pagar duas vezes. */
  let bankedCredits = 0
  let bankedDistance = 0
  const careerRank = () => rankLevel(save.data.career.xp)
  const renderWorld = () => ui.showWorld(save.data.world, save.data.credits, careerRank(), save.data.city)
  const travelMessage = (reason: string, id: string): string =>
    reason === 'rank-locked' ? 'REGIÃO BLOQUEADA PELA PATENTE'
      : reason === 'insufficient-credits' ? 'CRÉDITOS INSUFICIENTES'
        : reason === 'country-locked' ? `ABRA ${(countryOfCity(id)?.name ?? 'O PAÍS').toUpperCase()} PRIMEIRO`
          : 'PASSAGEM JÁ COMPRADA'
  /** Mostra o aviso e devolve true quando a patente atual ainda não libera o item. */
  function rankGate(unlockId: string): boolean {
    const need = requiredRank(unlockId)
    if (careerRank() >= need) return false
    ui.toast(`REQUER PATENTE ${need}`)
    return true
  }
  /** XP já creditado de uma corrida em andamento, para não contar duas vezes ao pausar/sair. */
  let bankedXp = 0
  const THEME_LABEL: Record<string, string> = { cidade: 'Metrópole', serra: 'Serra', deserto: 'Deserto' }
  /** Objetivo da corrida: automático, sem tela de aceite. Objetivo não cumprido continua valendo. */
  const ensureObjective = (): Contract | undefined => {
    if (!isUnlocked(careerRank(), 'mode-contratos')) return undefined
    const career = save.data.career
    const keep = career.activeData && career.activeData.id === career.activeContract && !career.activeData.cityId && !career.activeData.city
    if (keep) return career.activeData as Contract
    const objective = generateObjective(career.boardSeed, careerRank())
    save.update({ career: { ...career, activeContract: objective.id, activeData: objective } })
    return objective
  }
  const acceptedContract = ensureObjective
  function travelTo(id: string): boolean {
    const city = cityById(id)
    if (!city || !save.data.world.cities.includes(id)) return false
    save.update({ city: id, scenario: city.theme })
    game?.setCity(id, city.theme as ScenarioId)
    ui.setDestination(id)
    ui.toast(`DESTINO: ${city.name.toUpperCase()}`)
    return true
  }
  function refreshContractChip(): void {
    const active = ensureObjective()
    ui.setActiveContract(active ? `${describeObjective(active)} · +${active.reward.credits.toLocaleString('pt-BR')} CR` : null)
  }
  // contrato da corrida em andamento
  let runContract: Contract | null = null
  let runSkip = false
  let runRank = 1
  let deliveredNote = ''
  const secondsText = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
  function contractHud(snap: { distance: number; nearMisses: number; carsJumped: number; hits: number; elapsed: number }) {
    if (!runContract) return null
    const contract = runContract
    const hudTitle = contract.cityId ? contract.title : describeObjective(contract).toUpperCase()
    if (deliveredNote) return { title: hudTitle, text: describeObjective(contract), fraction: 1, state: 'done' as const, note: deliveredNote }
    const live = contractLive(contract, summaryOf(snap))
    const { kind, target } = contract.objective
    const progress = kind === 'distancia' ? `${(live.value / 1000).toFixed(2).replace('.', ',')} / ${(target / 1000).toFixed(1).replace('.', ',')} KM` : `${Math.floor(live.value)} / ${target}`
    if (live.failed) {
      const note = live.failed === 'cargo-lost' ? 'CARGA PERDIDA' : live.failed === 'too-slow' ? 'PRAZO ESGOTADO' : 'CIDADE ERRADA'
      return { title: hudTitle, text: progress, fraction: live.fraction, state: 'failed' as const, note }
    }
    const note = live.remaining !== undefined ? `PRAZO ${secondsText(live.remaining)}` : contract.cargo === 'fragil' ? 'NÃO BATA' : ''
    return { title: hudTitle, text: progress, fraction: live.fraction, state: 'active' as const, note }
  }
  function checkDelivery(snap: { distance: number; nearMisses: number; carsJumped: number; hits: number; elapsed: number }): void {
    if (!runContract || deliveredNote || tuning.unranked) return
    if (!contractLive(runContract, summaryOf(snap)).delivered) return
    const report = deliverContract(save.data.career, runContract)
    if (!report) return
    save.update({
      career: report.career,
      credits: save.data.credits + report.credits,
      lifetimeCredits: save.data.lifetimeCredits + report.credits,
    })
    deliveredNote = `ENTREGUE · +${report.credits.toLocaleString('pt-BR')} CR · +${report.xp.toLocaleString('pt-BR')} XP`
    game?.cheer()
    ui.toast('OBJETIVO CUMPRIDO!')
    if (report.rankAfter > report.rankBefore) ui.toast(`PATENTE ${rankLabel(save.data.career.xp).toUpperCase()}`)
  }
  const summaryOf = (snap: { distance: number; nearMisses: number; carsJumped: number; hits: number; elapsed: number }): RunSummary => ({
    distance: snap.distance, nearMisses: snap.nearMisses, carsJumped: snap.carsJumped, hits: snap.hits, seconds: snap.elapsed, city: game?.city ?? 'cidade', cityId: save.data.city, unranked: tuning.unranked,
  })
  /** Guarda o progresso parcial (créditos e distância) para não perder nada se a aba fechar no meio da corrida. */
  function bankRun(): void {
    if (!game || tuning.unranked) return
    if (game.mode !== 'playing' && game.mode !== 'paused') return
    const snap = game.snapshot()
    bankProgress(snap.distance, snap.nearMisses)
    const gain = Math.max(0, xpForRun(summaryOf(snap)).total - bankedXp)
    if (gain > 0) {
      save.update({ career: { ...save.data.career, xp: save.data.career.xp + gain } })
      bankedXp += gain
    }
  }
  function bankProgress(distance: number, nearMisses: number): number {
    const extra = game?.bonus ?? { distance: 0, nearMisses: 0 }
    const base = calculateRacePayout(distance, nearMisses).credits + calculateRacePayout(extra.distance, extra.nearMisses).credits
    const earned = Math.floor(base * cityMultiplier(game?.city ?? 'cidade').credits)
    const credits = Math.max(0, earned - bankedCredits)
    const meters = Math.max(0, distance - bankedDistance)
    if (credits > 0 || meters > 0) {
      save.update({
        credits: save.data.credits + credits,
        lifetimeCredits: save.data.lifetimeCredits + credits,
        totalDistance: save.data.totalDistance + meters,
        bestDistance: Math.max(save.data.bestDistance, distance),
      })
    }
    bankedCredits = earned
    bankedDistance = distance
    return earned
  }
  function showTitleScreen(): void {
    ui.showTitle(bestScore(), save.data.playerName, save.data.credits)
    ui.setDestination(save.data.city)
    refreshContractChip()
    ui.setSensitivity(save.data.sensitivity)
    ui.setSound(!save.data.muted)
    ui.setDistanceStats(save.data.bestDistance, save.data.totalDistance)
    ui.setCareer(save.data.career.xp)
  }
  function startRun(): void {
    if (!game) return
    bankRun()
    bankedCredits = 0
    bankedDistance = 0
    bankedXp = 0
    runRank = careerRank()
    runContract = null
    runSkip = false
    deliveredNote = ''
    const active = isUnlocked(runRank, 'mode-contratos') ? acceptedContract() : undefined
    if (active) {
      const wrongPlace = active.cityId ? active.cityId !== save.data.city : active.city ? active.city !== game.city : false
      if (wrongPlace) {
        runSkip = true
        ui.toast(`O OBJETIVO PEDE ${(active.cityName ?? THEME_LABEL[active.city] ?? active.city).toUpperCase()} · TROQUE O DESTINO NO MAPA`)
      } else runContract = active
    }
    game.setTrafficBoost(runContract?.trafficBoost ?? 1)
    lastLevel = 1
    audio.unlock()
    game.start()
    resultHandled = false
    ui.show('hud')
    loop?.resetAccumulator()
  }
  function pauseRun(): void {
    if (!game || game.mode !== 'playing') return
    game.pause()
    ui.showPause()
  }
  function resumeRun(): void {
    if (!game || game.mode !== 'paused') return
    audio.unlock()
    game.resume()
    ui.show('hud')
    loop?.resetAccumulator()
  }

  ui.setBootProgress(0.08, 'Montando o carro e carregando a cidade…')
  const [crash, engine] = await Promise.all([
    loadSound(audio, CRASH_SOUND_URL),
    loadSound(audio, ENGINE_SOUND_URL),
    document.fonts.ready,
  ]).then(([crashBuffer, engineBuffer]) => [crashBuffer, engineBuffer] as const)
  crashSound = crash ?? undefined
  engineSound = engine ?? undefined

  ui.setBootProgress(0.76, 'Preparando o trânsito…')
  await preloadSupercar().catch(() => undefined) // optional: falls back to the procedural Gol if it cannot load
  const renderer = new Renderer(canvas, save.data.quality)
  game = new RaceGame(renderer, input, audio, { crash: crashSound, engine: engineSound, playerVehicle: save.data.playerVehicle as PlayerVehicleId, scenario: save.data.scenario as ScenarioId, playerPaint: save.data.playerPaint, playerWheels: save.data.playerWheels, playerTint: save.data.playerTint, playerSpoiler: save.data.playerSpoiler, playerSuspension: save.data.playerSuspension, playerExhaust: save.data.playerExhaust, playerHeadlights: save.data.playerHeadlights })
  game.setCity(save.data.city, save.data.scenario as ScenarioId)
  game.setPowerLevels(save.data.powerLevels)
  if (import.meta.env.DEV) {
    const [{ registerGameTuning }] = await Promise.all([import('../scripts/manus-tuning/adapter.js')])
    void registerGameTuning(tuning)
  }
  new TouchControls(root, input, () => game?.mode === 'playing')
  ui.setBootProgress(1, 'A cidade está pronta.')
  input.sensitivity = save.data.sensitivity
  showTitleScreen()

  const currentGame = game
  loop = new GameLoop({
    beforeFrame: frameSeconds => {
      input.update(frameSeconds)
      if (input.consume('pause')) {
        if (currentGame.mode === 'playing') pauseRun()
        else if (currentGame.mode === 'paused') resumeRun()
      }
    },
    step: dt => {
      if (currentGame.mode === 'title' && (input.consume('confirm') || input.consume('jump'))) startRun()
      currentGame.step(dt)
    },
    render: (_alpha, frameSeconds) => {
      currentGame.setGarageView(ui.screen === 'garage')
      const state = currentGame.render(frameSeconds)
      if (currentGame.mode === 'playing') checkDelivery(state)
      if (currentGame.mode === 'playing' || currentGame.mode === 'ended') ui.update({ ...state, contract: currentGame.mode === 'playing' ? contractHud(state) : null })
      if (currentGame.mode === 'playing' && state.level > lastLevel) { lastLevel = state.level; ui.toast(`NÍVEL ${state.level} · TRÁFEGO MAIS RÁPIDO`) }
      if (currentGame.mode === 'ended' && !resultHandled) {
        resultHandled = true
        const result = currentGame.result
        if (result) finishRun(result)
      }
      loop!.paused = currentGame.mode !== 'playing'
      input.endFrame()
    },
  })
  loop.start()

  function finishRun(result: RaceResult): void {
    const previousBest = bestScore()
    let nextBest = previousBest
    let payout = 0
    let report: ReturnType<typeof applyRun> | null = null
    if (!result.unranked) {
      const entry = { name: save.data.playerName, score: result.score, seconds: result.seconds, at: Date.now() }
      const inserted = insertScore(save.data.leaderboard, entry)
      payout = bankProgress(result.distance, result.nearMisses) // paga só o que ainda não foi guardado
      // carreira: soma só o que ainda não foi creditado e avalia o contrato aceito
      const keptContract = save.data.career.activeContract
      const before = { ...save.data.career, xp: Math.max(0, save.data.career.xp - bankedXp), activeContract: runSkip ? '' : keptContract, activeData: runSkip ? null : save.data.career.activeData }
      report = applyRun(before, { distance: result.distance, nearMisses: result.nearMisses, carsJumped: result.carsJumped, hits: result.hits, seconds: result.seconds, city: result.city, cityId: save.data.city }, runRank)
      if (runSkip) report = { ...report, career: { ...report.career, activeContract: keptContract, activeData: save.data.career.activeData } }
      payout += report.contractCredits
      save.update({
        leaderboard: inserted.board,
        completedRuns: save.data.completedRuns + 1,
        career: report.career,
        credits: save.data.credits + report.contractCredits,
        lifetimeCredits: save.data.lifetimeCredits + report.contractCredits,
      })
      bankedXp = 0
      nextBest = Math.max(previousBest, inserted.board[0]?.score ?? 0)
    }
    ui.setCareer(save.data.career.xp)
    ui.setResultCareer(report)
    ui.showResults(result.score, result.distance, result.nearMisses, result.unranked ? previousBest : nextBest, result.unranked, payout, save.data.credits)
    if (report && report.rankAfter > report.rankBefore) ui.toast(`PATENTE ${rankLabel(save.data.career.xp).toUpperCase()}`)
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseRun(); bankRun() } })
  window.addEventListener('pagehide', bankRun)
  // Garagem: arraste para girar o carro, roda do mouse/pinça para zoom, duplo clique restaura a vista.
  let orbit: { id: number; x: number; y: number } | null = null
  const inGarageView = (target: EventTarget | null) => ui.screen === 'garage' && !(target as HTMLElement | null)?.closest?.('.garage-modal, button, input')
  window.addEventListener('pointerdown', event => {
    if (!inGarageView(event.target)) return
    orbit = { id: event.pointerId, x: event.clientX, y: event.clientY }
  })
  window.addEventListener('pointermove', event => {
    if (!orbit || event.pointerId !== orbit.id) return
    currentGame.garageOrbit(event.clientX - orbit.x, event.clientY - orbit.y)
    orbit.x = event.clientX
    orbit.y = event.clientY
  })
  const endOrbit = (event: PointerEvent) => { if (orbit && event.pointerId === orbit.id) orbit = null }
  window.addEventListener('pointerup', endOrbit)
  window.addEventListener('pointercancel', endOrbit)
  window.addEventListener('wheel', event => { if (inGarageView(event.target)) currentGame.garageZoom(event.deltaY) }, { passive: true })
  window.addEventListener('dblclick', event => { if (inGarageView(event.target)) currentGame.resetGarageView() })
  window.addEventListener('keydown', event => { if (event.code === 'Escape' && (ui.screen === 'garage' || ui.screen === 'leaderboard' || ui.screen === 'world')) ui.goBack() })
  window.addEventListener('game:pause', pauseRun)
  ;(window as unknown as { __game: unknown }).__game = { game: currentGame, ui, input, save }
}

async function loadSound(audio: Audio, url: string | undefined): Promise<AudioBuffer | null> {
  if (!url) return null
  try { return await audio.load(url) } catch (error) {
    console.warn(`Efeito de áudio opcional indisponível: ${url}`, error)
    return null
  }
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

boot().catch(error => {
  console.error(error)
  activeUI?.fatal(String((error as Error)?.message ?? error).replace(/[<>&]/g, ''))
})
