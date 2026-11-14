import './styles/race-game.css'
import { Audio } from './engine/audio'
import { Input } from './engine/input'
import { GameLoop } from './engine/loop'
import { Renderer, suggestQuality } from './engine/renderer'
import { SAVE_KEY, SaveStore, insertScore } from './engine/save'
import { RaceGame, type RaceResult } from './game/race-game'
import { calculateRacePayout, purchaseVehicle as buyVehicle, purchasePaint as buyPaint, purchaseWheels as buyWheels, purchaseTint as buyTint, purchaseSpoiler as buySpoiler, purchaseSuspension as buySuspension, purchaseExhaust as buyExhaust, purchaseHeadlights as buyHeadlights } from './game/economy'
import type { BrazilianTrafficModel } from './game/traffic-vehicles'
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
    toTitle: () => { game?.toTitle(); ui.showTitle(bestScore(), save.data.playerName, save.data.credits) },
    openLeaderboard: () => { ui.showLeaderboard(save.data.leaderboard) },
    openGarage: () => { ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    selectVehicle: model => {
      if (!save.data.unlockedVehicles.includes(model)) return
      save.update({ playerVehicle: model })
      game?.setPlayerVehicle(model, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(model, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
    },
    purchaseVehicle: model => {
      const purchase = buyVehicle(save.data.credits, save.data.unlockedVehicles, model)
      if (!purchase.success) {
        ui.toast(purchase.reason === 'already-owned' ? 'VEÍCULO JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES')
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
    purchasePaint: paint => {
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
    purchaseWheels: id => {
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
    purchaseTint: id => {
      const result = buyTint(save.data.credits, save.data.unlockedTints, id)
      if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'INSULFILM JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES'); return false }
      save.update({ credits: result.balance, unlockedTints: result.unlocked, playerTint: id })
      game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, id, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights)
      ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights)
      ui.toast('INSULFILM COMPRADO E APLICADO'); return true
    },
    selectSpoiler: id => { if (!save.data.unlockedSpoilers.includes(id)) return; save.update({ playerSpoiler: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, id, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    purchaseSpoiler: id => { const result = buySpoiler(save.data.credits, save.data.unlockedSpoilers, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'AEROFÓLIO JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedSpoilers: result.unlocked, playerSpoiler: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, id, save.data.playerSuspension, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights); ui.toast('AEROFÓLIO COMPRADO E INSTALADO'); return true },
    selectSuspension: id => { if (!save.data.unlockedSuspensions.includes(id)) return; save.update({ playerSuspension: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, id, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    purchaseSuspension: id => { const result = buySuspension(save.data.credits, save.data.unlockedSuspensions, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'SUSPENSÃO JÁ DESBLOQUEADA' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedSuspensions: result.unlocked, playerSuspension: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, id, save.data.playerExhaust, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights); ui.toast('SUSPENSÃO COMPRADA E INSTALADA'); return true },
    selectExhaust: id => { if (!save.data.unlockedExhausts.includes(id)) return; save.update({ playerExhaust: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, id, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, id, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights) },
    purchaseExhaust: id => { const result = buyExhaust(save.data.credits, save.data.unlockedExhausts, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'ESCAPAMENTO JÁ DESBLOQUEADO' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedExhausts: result.unlocked, playerExhaust: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, id, save.data.playerHeadlights); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, id, save.data.unlockedExhausts, save.data.playerHeadlights, save.data.unlockedHeadlights); ui.toast('ESCAPAMENTO COMPRADO E INSTALADO'); return true },
    selectHeadlights: id => { if (!save.data.unlockedHeadlights.includes(id)) return; save.update({ playerHeadlights: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, id); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, id, save.data.unlockedHeadlights) },
    purchaseHeadlights: id => { const result = buyHeadlights(save.data.credits, save.data.unlockedHeadlights, id); if (!result.success) { ui.toast(result.reason === 'already-owned' ? 'FARÓIS JÁ DESBLOQUEADOS' : 'CRÉDITOS INSUFICIENTES'); return false }; save.update({ credits: result.balance, unlockedHeadlights: result.unlocked, playerHeadlights: id }); game?.setPlayerVehicle(save.data.playerVehicle, save.data.playerPaint, save.data.playerWheels, save.data.playerTint, save.data.playerSpoiler, save.data.playerSuspension, save.data.playerExhaust, id); ui.showGarage(save.data.playerVehicle, save.data.unlockedVehicles, save.data.credits, save.data.playerPaint, save.data.unlockedPaints, save.data.playerWheels, save.data.unlockedWheels, save.data.playerTint, save.data.unlockedTints, save.data.playerSpoiler, save.data.unlockedSpoilers, save.data.playerSuspension, save.data.unlockedSuspensions, save.data.playerExhaust, save.data.unlockedExhausts, id, save.data.unlockedHeadlights); ui.toast('FARÓIS COMPRADOS E INSTALADOS'); return true },
  })
  activeUI = ui
  const applySettings = () => audio.setVolumes(save.data.musicVolume, save.data.sfxVolume, save.data.muted)
  applySettings()

  let game: RaceGame | undefined
  let loop: GameLoop | undefined
  let resultHandled = false
  let crashSound: AudioBuffer | undefined
  let engineSound: AudioBuffer | undefined

  function bestScore(): number {
    return save.data.leaderboard[0]?.score ?? 0
  }
  function startRun(): void {
    if (!game) return
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
  const renderer = new Renderer(canvas, save.data.quality)
  game = new RaceGame(renderer, input, audio, { crash: crashSound, engine: engineSound, playerVehicle: save.data.playerVehicle as BrazilianTrafficModel, playerPaint: save.data.playerPaint, playerWheels: save.data.playerWheels, playerTint: save.data.playerTint, playerSpoiler: save.data.playerSpoiler, playerSuspension: save.data.playerSuspension, playerExhaust: save.data.playerExhaust, playerHeadlights: save.data.playerHeadlights })
  if (import.meta.env.DEV) {
    const [{ registerGameTuning }] = await Promise.all([import('../scripts/manus-tuning/adapter.js')])
    void registerGameTuning(tuning)
  }
  new TouchControls(root, input, () => game?.mode === 'playing')
  ui.setBootProgress(1, 'A cidade está pronta.')
  ui.showTitle(bestScore(), save.data.playerName, save.data.credits)

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
      const state = currentGame.render(frameSeconds)
      if (currentGame.mode === 'playing' || currentGame.mode === 'ended') ui.update(state)
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
    if (!result.unranked) {
      const entry = { name: save.data.playerName, score: result.score, seconds: result.seconds, at: Date.now() }
      const inserted = insertScore(save.data.leaderboard, entry)
      payout = calculateRacePayout(result.distance, result.nearMisses).credits
      save.update({
        leaderboard: inserted.board,
        credits: save.data.credits + payout,
        lifetimeCredits: save.data.lifetimeCredits + payout,
        completedRuns: save.data.completedRuns + 1,
      })
      nextBest = Math.max(previousBest, inserted.board[0]?.score ?? 0)
    }
    ui.showResults(result.score, result.distance, result.nearMisses, result.unranked ? previousBest : nextBest, result.unranked, payout, save.data.credits)
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseRun() })
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
