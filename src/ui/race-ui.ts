import copy from '../i18n/pt-BR.json'
import type { PlayerVehicleId, ScoreEntry } from '../engine/save'
import { PAINT_OPTIONS, VEHICLE_PRICES, WHEEL_OPTIONS, TINT_OPTIONS, SPOILER_OPTIONS, SUSPENSION_OPTIONS, EXHAUST_OPTIONS, HEADLIGHT_OPTIONS } from '../game/economy'
import { BRAZILIAN_TRAFFIC_MODELS } from '../game/traffic-vehicles'
import { SUPERCAR } from '../game/supercar'
import { SCENARIOS } from '../game/scenarios'

export type RaceUiState = {
  score: number
  distance: number
  speedKmh: number
  lives: number
  nearMisses: number
  nitro: number
  mode: 'title' | 'playing' | 'paused' | 'ended'
}

export type RaceUiActions = {
  start(): void
  updateName(name: string): void
  pause(): void
  resume(): void
  restart(): void
  toTitle(): void
  openLeaderboard(): void
  selectVehicle(model: PlayerVehicleId): void
  purchaseVehicle(model: PlayerVehicleId): boolean
  selectPaint(paint: string): void
  purchasePaint(paint: string): boolean
  selectWheels(id: string): void
  purchaseWheels(id: string): boolean
  selectTint(id: string): void
  purchaseTint(id: string): boolean
  selectSpoiler(id: string): void
  purchaseSpoiler(id: string): boolean
  selectSuspension(id: string): void
  purchaseSuspension(id: string): boolean
  selectExhaust(id: string): void
  purchaseExhaust(id: string): boolean
  selectHeadlights(id: string): void
  purchaseHeadlights(id: string): boolean
  openGarage(): void
  selectScenario(id: string): void
  setSensitivity(value: number): void
}

export class RaceUI {
  screen: 'boot' | 'title' | 'hud' | 'pause' | 'results' | 'leaderboard' | 'garage' = 'boot'
  private readonly root: HTMLElement
  private noticeTimer = 0
  private returnAfterBoard: RaceUI['screen'] = 'title'
  private returnAfterGarage: RaceUI['screen'] = 'title'
  constructor(root: HTMLElement, private readonly actions: RaceUiActions) {
    this.root = root
    this.root.innerHTML = this.template()
    this.root.addEventListener('click', event => this.onClick(event))
    this.root.addEventListener('input', event => {
      const el = event.target
      if (el instanceof HTMLInputElement && el.classList.contains('sens-slider')) this.actions.setSensitivity(Number(el.value))
    })
    this.root.addEventListener('change', event => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || !input.classList.contains('driver-name')) return
      const name = input.value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 16) || 'PILOTO'
      input.value = name
      this.actions.updateName(name)
    })
    this.show('boot')
  }

  setBootProgress(progress: number, status = copy['boot.loading']): void {
    const bar = this.root.querySelector<HTMLElement>('.boot-progress i')
    const label = this.root.querySelector<HTMLElement>('.boot-status')
    if (bar) bar.style.width = `${Math.round(Math.max(0.04, Math.min(1, progress)) * 100)}%`
    if (label) label.textContent = status
  }

  show(screen: RaceUI['screen']): void {
    if (screen === 'leaderboard') this.returnAfterBoard = this.screen === 'hud' ? 'pause' : this.screen
    this.screen = screen
    this.root.dataset.activeScreen = screen
    document.body.classList.toggle('is-driving', screen === 'hud')
    for (const section of this.root.querySelectorAll<HTMLElement>('[data-screen]')) {
      const active = section.dataset.screen === screen
      section.classList.toggle('is-active', active)
      section.setAttribute('aria-hidden', String(!active))
    }
  }

  update(state: RaceUiState): void {
    this.set('.hud-score-value', state.score.toLocaleString('pt-BR'))
    this.set('.hud-distance-value', `${(state.distance / 1000).toFixed(2)} ${copy['unit.km']}`)
    this.set('.hud-speed-value', String(Math.max(0, Math.round(state.speedKmh))))
    const damage = this.root.querySelector('.damage-row')
    if (damage && damage.childElementCount !== 3) damage.innerHTML = '<i class="damage"></i><i class="damage"></i><i class="damage"></i>'
    this.root.querySelectorAll<HTMLElement>('.damage').forEach((el, i) => el.classList.toggle('is-empty', i >= state.lives))
    const nitro = this.root.querySelector<HTMLElement>('.nitro-track i')
    if (nitro) nitro.style.transform = `scaleX(${Math.max(0, Math.min(1, state.nitro))})`
    const miss = this.root.querySelector<HTMLElement>('.hud-near-miss')
    if (miss) miss.textContent = state.nearMisses ? `${state.nearMisses} ${copy['results.nearMiss']}` : ''
  }

  showTitle(best: number, playerName = 'PILOTO', credits = 0): void {
    this.set('.title-best-value', best.toLocaleString('pt-BR'))
    this.set('.wallet-balance', credits.toLocaleString('pt-BR'))
    const name = this.root.querySelector<HTMLInputElement>('.driver-name')
    if (name) name.value = playerName
    this.show('title')
  }

  showGarage(selected: PlayerVehicleId, unlocked: PlayerVehicleId[] = ['gol-g5'], credits = 0, selectedPaint = '#4a5052', unlockedPaints: string[] = ['#4a5052'], selectedWheels = 'alloy', unlockedWheels: string[] = ['alloy'], selectedTint = 'smoke', unlockedTints: string[] = ['smoke'], selectedSpoiler = 'none', unlockedSpoilers: string[] = ['none'], selectedSuspension = 'stock', unlockedSuspensions: string[] = ['stock'], selectedExhaust = 'stock', unlockedExhausts: string[] = ['stock'], selectedHeadlights = 'halogen', unlockedHeadlights: string[] = ['halogen']): void {
    if (this.screen !== 'garage') this.returnAfterGarage = this.screen === 'pause' ? 'pause' : 'title'
    this.set('.garage-balance', credits.toLocaleString('pt-BR'))
    const grid = this.root.querySelector<HTMLElement>('.garage-grid')
    if (grid) {
      const premium = [{ id: SUPERCAR.id, label: SUPERCAR.label, utility: undefined as string | undefined, premium: true }]
      grid.innerHTML = [...BRAZILIAN_TRAFFIC_MODELS, ...premium].map(model => {
        const active = model.id === selected
        const owned = unlocked.includes(model.id)
        const type = 'premium' in model ? 'ESPORTIVO' : model.utility === 'pickup' ? 'PICAPE' : model.utility === 'van' ? 'UTILITÁRIO' : 'HATCH'
        const price = VEHICLE_PRICES[model.id as PlayerVehicleId]
        if (owned) {
          return '<button class="garage-car ' + (active ? 'is-selected' : '') + '" data-vehicle="' + model.id + '" aria-pressed="' + active + '"><span class="garage-car-type">' + type + '</span><strong>' + model.label + '</strong><small>' + (active ? 'EM USO' : 'SELECIONAR') + '</small></button>'
        }
        const affordable = credits >= price
        return '<button class="garage-car is-locked" data-buy-vehicle="' + model.id + '" ' + (affordable ? '' : 'disabled') + '><span class="garage-car-type">' + type + ' · BLOQUEADO</span><strong>' + model.label + '</strong><small>' + price.toLocaleString('pt-BR') + ' CR · ' + (affordable ? 'COMPRAR' : 'SALDO INSUFICIENTE') + '</small></button>'
      }).join('')
    }
    const paintGrid = this.root.querySelector<HTMLElement>('.paint-grid')
    if (paintGrid) paintGrid.innerHTML = PAINT_OPTIONS.map(option => {
      const owned = unlockedPaints.includes(option.id)
      const active = selectedPaint.toLowerCase() === option.id
      const affordable = credits >= option.price
      const action = owned ? 'data-paint' : 'data-buy-paint'
      const disabled = !owned && !affordable ? 'disabled' : ''
      const label = owned ? (active ? 'EM USO' : 'APLICAR') : (option.price.toLocaleString('pt-BR') + ' CR')
      return '<button class="paint-swatch ' + (active ? 'is-selected' : '') + '" ' + action + '="' + option.id + '" ' + disabled + ' aria-label="' + option.label + ': ' + label + '"><i style="--paint:' + option.id + '"></i><strong>' + option.label + '</strong><small>' + label + '</small></button>'
    }).join('')
    const wheelGrid = this.root.querySelector<HTMLElement>('.wheel-grid')
    if (wheelGrid) wheelGrid.innerHTML = WHEEL_OPTIONS.map(option => { const owned = unlockedWheels.includes(option.id); const active = selectedWheels === option.id; const label = owned ? (active ? 'EM USO' : 'APLICAR') : `${option.price} CR`; return `<button class="accessory-option ${active ? 'is-selected' : ''}" ${owned ? 'data-wheels' : 'data-buy-wheels'}="${option.id}" ${!owned && credits < option.price ? 'disabled' : ''}><i style="--sample:${option.color}"></i><strong>${option.label}</strong><small>${label}</small></button>` }).join('')
    const tintGrid = this.root.querySelector<HTMLElement>('.tint-grid')
    if (tintGrid) tintGrid.innerHTML = TINT_OPTIONS.map(option => { const owned = unlockedTints.includes(option.id); const active = selectedTint === option.id; const label = owned ? (active ? 'EM USO' : 'APLICAR') : `${option.price} CR`; return `<button class="accessory-option ${active ? 'is-selected' : ''}" ${owned ? 'data-tint' : 'data-buy-tint'}="${option.id}" ${!owned && credits < option.price ? 'disabled' : ''}><i style="--sample:${option.color}"></i><strong>${option.label}</strong><small>${label}</small></button>` }).join('')
    const spoilerGrid = this.root.querySelector<HTMLElement>('.spoiler-grid')
    if (spoilerGrid) spoilerGrid.innerHTML = SPOILER_OPTIONS.map(option => { const owned = unlockedSpoilers.includes(option.id); const active = selectedSpoiler === option.id; const label = owned ? (active ? 'EM USO' : 'APLICAR') : `${option.price} CR`; return `<button class="accessory-option ${active ? 'is-selected' : ''}" ${owned ? 'data-spoiler' : 'data-buy-spoiler'}="${option.id}" ${!owned && credits < option.price ? 'disabled' : ''}><i class="accessory-symbol">${option.id === 'none' ? '—' : '▰'}</i><strong>${option.label}</strong><small>${label}</small></button>` }).join('')
    const suspensionGrid = this.root.querySelector<HTMLElement>('.suspension-grid')
    if (suspensionGrid) suspensionGrid.innerHTML = SUSPENSION_OPTIONS.map(option => { const owned = unlockedSuspensions.includes(option.id); const active = selectedSuspension === option.id; const label = owned ? (active ? 'EM USO' : 'APLICAR') : `${option.price} CR`; return `<button class="accessory-option ${active ? 'is-selected' : ''}" ${owned ? 'data-suspension' : 'data-buy-suspension'}="${option.id}" ${!owned && credits < option.price ? 'disabled' : ''}><i class="accessory-symbol">${option.id === 'stock' ? '↕' : option.id === 'lowered' ? '↧' : '⇊'}</i><strong>${option.label}</strong><small>${label}</small></button>` }).join('')
    const exhaustGrid = this.root.querySelector<HTMLElement>('.exhaust-grid')
    if (exhaustGrid) exhaustGrid.innerHTML = EXHAUST_OPTIONS.map(option => { const owned = unlockedExhausts.includes(option.id); const active = selectedExhaust === option.id; const label = owned ? (active ? 'EM USO' : 'APLICAR') : `${option.price} CR`; return `<button class="accessory-option ${active ? 'is-selected' : ''}" ${owned ? 'data-exhaust' : 'data-buy-exhaust'}="${option.id}" ${!owned && credits < option.price ? 'disabled' : ''}><i class="accessory-symbol">${option.id === 'stock' ? '○' : option.id === 'sport' ? '◉' : '◎'}</i><strong>${option.label}</strong><small>${label}</small></button>` }).join('')
    const headlightGrid = this.root.querySelector<HTMLElement>('.headlight-grid')
    if (headlightGrid) headlightGrid.innerHTML = HEADLIGHT_OPTIONS.map(option => { const owned = unlockedHeadlights.includes(option.id); const active = selectedHeadlights === option.id; const label = owned ? (active ? 'EM USO' : 'APLICAR') : `${option.price} CR`; return `<button class="accessory-option ${active ? 'is-selected' : ''}" ${owned ? 'data-headlights' : 'data-buy-headlights'}="${option.id}" ${!owned && credits < option.price ? 'disabled' : ''}><i class="accessory-symbol">${option.id === 'halogen' ? 'H' : option.id === 'xenon' ? 'X' : 'LED'}</i><strong>${option.label}</strong><small>${label}</small></button>` }).join('')
    this.show('garage')
  }
  showPause(): void {
    this.show('pause')
  }

  showResults(score: number, distance: number, nearMisses: number, best: number, unranked: boolean, payout: number, balance: number): void {
    this.set('.result-score', score.toLocaleString('pt-BR'))
    this.set('.result-distance', `${(distance / 1000).toFixed(2)} ${copy['unit.km']}`)
    this.set('.result-near-misses', String(nearMisses))
    this.root.querySelector('.record-badge')?.classList.toggle('is-visible', !unranked && score > 0 && score >= best)
    this.set('.result-note', unranked ? 'CORRIDA DE TESTE · NÃO ENVIADA AO PLACAR' : 'RECORDE SALVO NESTE DISPOSITIVO')
    this.set('.result-credits', '+' + payout.toLocaleString('pt-BR') + ' CR')
    this.set('.result-balance', balance.toLocaleString('pt-BR'))
    this.show('results')
  }

  showLeaderboard(entries: ScoreEntry[], online = false, status = ''): void {
    this.set('.board-source', online ? copy['leaderboard.online'] : copy['leaderboard.local'])
    const list = this.root.querySelector<HTMLOListElement>('.score-list')!
    if (!entries.length) {
      list.innerHTML = `<li class="score-empty">${status || copy['leaderboard.empty']}</li>`
    } else {
      list.innerHTML = entries.slice(0, 10).map((_, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><span class="board-name"></span><em class="board-score"></em></li>`).join('')
      list.querySelectorAll<HTMLElement>('.board-name').forEach((el, index) => { el.textContent = entries[index].name })
      list.querySelectorAll<HTMLElement>('.board-score').forEach((el, index) => { el.textContent = entries[index].score.toLocaleString('pt-BR') })
    }
    this.show('leaderboard')
  }

  toast(text: string): void {
    const notice = this.root.querySelector<HTMLElement>(this.screen === 'garage' ? '.garage-notice' : '.center-notice')
    if (!notice) return
    notice.textContent = text
    notice.classList.add('show')
    window.clearTimeout(this.noticeTimer)
    this.noticeTimer = window.setTimeout(() => notice.classList.remove('show'), 950)
  }

  fatal(message: string): void {
    this.setBootProgress(1, `Falha ao iniciar: ${message}`)
  }

  private onClick(event: MouseEvent): void {
    const buyExhaust = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-exhaust]')
    if (buyExhaust?.dataset.buyExhaust) { this.actions.purchaseExhaust(buyExhaust.dataset.buyExhaust); return }
    const exhaust = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-exhaust]')
    if (exhaust?.dataset.exhaust) { this.actions.selectExhaust(exhaust.dataset.exhaust); return }
    const buyHeadlights = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-headlights]')
    if (buyHeadlights?.dataset.buyHeadlights) { this.actions.purchaseHeadlights(buyHeadlights.dataset.buyHeadlights); return }
    const headlights = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-headlights]')
    if (headlights?.dataset.headlights) { this.actions.selectHeadlights(headlights.dataset.headlights); return }
    const buySpoiler = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-spoiler]')
    if (buySpoiler?.dataset.buySpoiler) { this.actions.purchaseSpoiler(buySpoiler.dataset.buySpoiler); return }
    const spoiler = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-spoiler]')
    if (spoiler?.dataset.spoiler) { this.actions.selectSpoiler(spoiler.dataset.spoiler); return }
    const buySuspension = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-suspension]')
    if (buySuspension?.dataset.buySuspension) { this.actions.purchaseSuspension(buySuspension.dataset.buySuspension); return }
    const suspension = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-suspension]')
    if (suspension?.dataset.suspension) { this.actions.selectSuspension(suspension.dataset.suspension); return }
    const buyWheels = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-wheels]')
    if (buyWheels?.dataset.buyWheels) { this.actions.purchaseWheels(buyWheels.dataset.buyWheels); return }
    const wheels = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-wheels]')
    if (wheels?.dataset.wheels) { this.actions.selectWheels(wheels.dataset.wheels); return }
    const buyTint = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-tint]')
    if (buyTint?.dataset.buyTint) { this.actions.purchaseTint(buyTint.dataset.buyTint); return }
    const tint = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tint]')
    if (tint?.dataset.tint) { this.actions.selectTint(tint.dataset.tint); return }
    const buyPaint = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-paint]')
    if (buyPaint?.dataset.buyPaint) { this.actions.purchasePaint(buyPaint.dataset.buyPaint); return }
    const paint = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-paint]')
    if (paint?.dataset.paint) { this.actions.selectPaint(paint.dataset.paint); return }
    const scenario = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scenario]')
    if (scenario?.dataset.scenario) { this.actions.selectScenario(scenario.dataset.scenario); return }
    const buy = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-buy-vehicle]')
    if (buy?.dataset.buyVehicle) {
      this.actions.purchaseVehicle(buy.dataset.buyVehicle as PlayerVehicleId)
      return
    }
    const vehicle = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-vehicle]')
    if (vehicle?.dataset.vehicle) {
      this.actions.selectVehicle(vehicle.dataset.vehicle as PlayerVehicleId)
      return
    }
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
    if (!button) return
    switch (button.dataset.action) {
      case 'play': this.actions.start(); break
      case 'pause': this.actions.pause(); break
      case 'resume': this.actions.resume(); break
      case 'restart': this.actions.restart(); break
      case 'title': this.actions.toTitle(); break
      case 'leaderboard': this.actions.openLeaderboard(); break
      case 'garage': this.actions.openGarage(); break
      case 'garage-back': this.show(this.returnAfterGarage); break
      case 'back': this.show(this.returnAfterBoard); break
    }
  }

  /** Highlights the chosen scenario on the title screen. */
  setScenario(id: string): void {
    this.root.querySelectorAll<HTMLElement>('[data-scenario]').forEach(btn => {
      const on = btn.dataset.scenario === id
      btn.classList.toggle('is-selected', on)
      btn.setAttribute('aria-pressed', String(on))
    })
  }

  /** Keeps every sensitivity slider (title and pause) in sync. */
  setSensitivity(value: number): void {
    this.root.querySelectorAll<HTMLInputElement>('.sens-slider').forEach(el => { if (Number(el.value) !== value) el.value = String(value) })
    this.root.querySelectorAll<HTMLElement>('.sens-value').forEach(el => { el.textContent = value.toFixed(2).replace(/0$/, '') + '×' })
  }

  setDistanceStats(bestMeters: number, totalMeters: number): void {
    this.set('.title-dist-value', (bestMeters / 1000).toFixed(2).replace('.', ',') + ' km')
    this.set('.title-total-value', (totalMeters / 1000).toFixed(1).replace('.', ',') + ' km')
  }

  private set(selector: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(selector)
    if (element && element.textContent !== value) element.textContent = value
  }

  private template(): string {
    return `
<section class="screen screen-boot is-active" data-screen="boot" aria-label="Carregando Asfalto">
  <img src="/asfalto-icon.svg" width="48" height="48" alt="" />
  <div class="boot-kicker">${copy['game.kicker']}</div><h1>${copy['game.title']}</h1>
  <p>${copy['game.subtitle']}</p><div class="boot-progress"><i></i></div><span class="boot-status">${copy['boot.loading']}</span>
</section>
<section class="screen screen-title" data-screen="title">
  <div class="top-brand"><img src="/asfalto-icon.svg" alt="" /><div><div class="brand-name">ASFALTO</div><div class="brand-sub">NOITE EM MOVIMENTO</div></div></div>
  <div class="title-panel"><div class="eyebrow">${copy['game.kicker']}</div><h1 class="game-wordmark">AS<span>FAL</span>TO</h1>
    <p class="title-copy">Uma noite. Três faixas. Tráfego sem fim. Desvie dos carros, acelere quando abrir espaço e veja até onde a cidade te leva.</p>
    <label class="pilot-input"><span>NOME NO PLACAR</span><input class="driver-name" name="pilot" type="text" maxlength="16" value="PILOTO" autocomplete="nickname" aria-label="Nome do piloto no placar" /></label>
    <div class="scenario-picker"><span>CENÁRIO</span><div class="scenario-row">${SCENARIOS.map(s => `<button class="scenario-btn" data-scenario="${s.id}" aria-pressed="false"><b>${s.label}</b><small>${s.blurb}</small></button>`).join('')}</div></div>
    <label class="sens-row"><span>SENSIBILIDADE DA DIREÇÃO <b class="sens-value">1×</b></span><input class="sens-slider" type="range" min="0.6" max="1.6" step="0.05" value="1" aria-label="Sensibilidade da direção" /></label>
    <div class="title-actions"><button class="game-btn primary" data-action="play">${copy['menu.play']} <span>↗</span></button><button class="game-btn" data-action="garage">GARAGEM <span>↗</span></button><button class="game-btn" data-action="leaderboard">${copy['menu.leaderboard']} <span>↗</span></button></div>
  </div>
  <div class="title-wallet">SALDO <b><span class="wallet-balance">0</span> CR</b></div><div class="title-best">RECORDE LOCAL <b class="title-best-value">0</b><span class="title-sub">MAIOR DISTÂNCIA <i class="title-dist-value">0 km</i></span><span class="title-sub">TOTAL RODADO <i class="title-total-value">0 km</i></span></div>
  <div class="title-foot">${copy['hint.keyboard']}</div>
</section>
<section class="screen screen-hud" data-screen="hud">
  <div class="hud-top"><div class="hud-block"><div class="hud-score-label">${copy['hud.score']}</div><div class="hud-score-value">0</div><div class="hud-meta"><span class="hud-distance-value">0,00 KM</span><span class="hud-near-miss"></span></div></div>
    <div class="hud-right"><div class="hud-block hud-speed"><div class="hud-speed-value">0<small>${copy['hud.speed']}</small></div><div class="hud-speed-label">${copy['hud.damage']}</div><div class="damage-row"><i class="damage"></i><i class="damage"></i><i class="damage"></i></div></div><button class="pause-btn" data-action="pause" aria-label="${copy['menu.pause']}">Ⅱ</button></div>
  </div>
  <div class="hud-hint">${copy['hint.keyboard']}</div><div class="nitro-widget"><div class="nitro-label"><span>${copy['hud.nitro']}</span><span>F</span></div><div class="nitro-track"><i></i></div></div>
  <div class="center-notice"></div>
</section>
<section class="screen screen-modal" data-screen="pause"><div class="modal"><div class="eyebrow">ASFALTO · PAUSA</div><h2>${copy['pause.title']}</h2><p>${copy['pause.subtitle']}</p>
  <label class="sens-row"><span>SENSIBILIDADE DA DIREÇÃO <b class="sens-value">1×</b></span><input class="sens-slider" type="range" min="0.6" max="1.6" step="0.05" value="1" aria-label="Sensibilidade da direção" /></label>
  <div class="modal-menu"><button class="game-btn primary" data-action="resume">${copy['menu.resume']}</button><button class="game-btn" data-action="restart">${copy['menu.restart']}</button><button class="game-btn" data-action="garage">GARAGEM</button><button class="game-btn" data-action="leaderboard">${copy['menu.leaderboard']}</button><button class="game-btn" data-action="title">${copy['menu.title']}</button></div>
</div></section>
<section class="screen screen-modal" data-screen="results"><div class="modal"><div class="eyebrow">ASFALTO · RESULTADO</div><h2>${copy['results.title']}</h2><div class="record-badge">${copy['results.best']}</div>
  <div class="result-caption">${copy['results.score']}</div><div class="result-score">0</div><div class="result-grid"><div>${copy['results.distance']}<b class="result-distance">0,00 KM</b></div><div>${copy['results.nearMiss']}<b class="result-near-misses">0</b></div></div><div class="payout-panel"><span>RECOMPENSA DA CORRIDA</span><strong class="result-credits">+0 CR</strong><small>SALDO: <b class="result-balance">0</b> CR</small></div><div class="modal-tag result-note"></div>
  <div class="modal-menu"><button class="game-btn primary" data-action="restart">${copy['results.retry']}</button><button class="game-btn" data-action="leaderboard">${copy['results.leaderboard']}</button><button class="game-btn" data-action="title">${copy['menu.title']}</button></div>
</div></section>
<section class="screen screen-modal" data-screen="garage"><div class="modal garage-modal"><div class="eyebrow">ASFALTO · GARAGEM</div><h2>ESCOLHA SEU CARRO</h2><p>Compre novos veículos com os créditos conquistados nas corridas. O Gol G5 continua sendo seu carro inicial.</p><div class="garage-wallet">SALDO DISPONÍVEL: <strong class="garage-balance"></strong> CR</div><div class="garage-notice" aria-live="polite"></div><h3 class="garage-section-title">PINTURA</h3><div class="paint-grid"></div><h3 class="garage-section-title">RODAS E AROS</h3><div class="wheel-grid accessory-grid"></div><h3 class="garage-section-title">INSULFILM</h3><div class="tint-grid accessory-grid"></div><h3 class="garage-section-title">AEROFÓLIO</h3><div class="spoiler-grid accessory-grid"></div><h3 class="garage-section-title">SUSPENSÃO</h3><div class="suspension-grid accessory-grid"></div><h3 class="garage-section-title">ESCAPAMENTO</h3><div class="exhaust-grid accessory-grid"></div><h3 class="garage-section-title">FARÓIS</h3><div class="headlight-grid accessory-grid"></div><h3 class="garage-section-title">VEÍCULOS</h3><div class="garage-grid"></div><div class="modal-menu"><button class="game-btn" data-action="garage-back">VOLTAR</button></div></div></section>
<section class="screen screen-modal" data-screen="leaderboard"><div class="modal"><div class="eyebrow">ASFALTO · RECORDES</div><h2>${copy['leaderboard.title']}</h2><div class="board-source">${copy['leaderboard.local']}</div><ol class="score-list"><li class="score-empty">${copy['leaderboard.empty']}</li></ol>
  <div class="modal-menu"><button class="game-btn" data-action="back">${copy['menu.back']}</button></div>
</div></section>
<div class="touch" aria-hidden="true"><div class="touch-stick"><i></i></div><div class="touch-actions"><button class="touch-btn" data-touch="sprint">${copy['touch.accelerate']}</button><button class="touch-btn" data-touch="dash">${copy['touch.nitro']}</button></div></div>
`
  }
}
