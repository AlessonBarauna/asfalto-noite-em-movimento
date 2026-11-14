import copy from '../i18n/pt-BR.json'
import type { ScoreEntry } from '../engine/save'
import { BRAZILIAN_TRAFFIC_MODELS, type BrazilianTrafficModel } from '../game/traffic-vehicles'

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
  selectVehicle(model: BrazilianTrafficModel): void
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

  showTitle(best: number, playerName = 'PILOTO'): void {
    this.set('.title-best-value', best.toLocaleString('pt-BR'))
    const name = this.root.querySelector<HTMLInputElement>('.driver-name')
    if (name) name.value = playerName
    this.show('title')
  }

  showGarage(selected: BrazilianTrafficModel): void {
    if (this.screen !== 'garage') this.returnAfterGarage = this.screen === 'pause' ? 'pause' : 'title'
    const grid = this.root.querySelector<HTMLElement>('.garage-grid')
    if (grid) {
      grid.innerHTML = BRAZILIAN_TRAFFIC_MODELS.map(model => {
        const active = model.id === selected
        const type = model.utility === 'pickup' ? 'PICAPE' : model.utility === 'van' ? 'UTILITÁRIO' : 'HATCH'
        return '<button class="garage-car ' + (active ? 'is-selected' : '') + '" data-vehicle="' + model.id + '" aria-pressed="' + active + '"><span class="garage-car-type">' + type + '</span><strong>' + model.label + '</strong><small>' + (active ? 'EM USO' : 'SELECIONAR') + '</small></button>'
      }).join('')
    }
    this.show('garage')
  }
  showPause(): void {
    this.show('pause')
  }

  showResults(score: number, distance: number, nearMisses: number, best: number, unranked: boolean): void {
    this.set('.result-score', score.toLocaleString('pt-BR'))
    this.set('.result-distance', `${(distance / 1000).toFixed(2)} ${copy['unit.km']}`)
    this.set('.result-near-misses', String(nearMisses))
    this.root.querySelector('.record-badge')?.classList.toggle('is-visible', !unranked && score > 0 && score >= best)
    this.set('.result-note', unranked ? 'CORRIDA DE TESTE · NÃO ENVIADA AO PLACAR' : 'RECORDE SALVO NESTE DISPOSITIVO')
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
    const notice = this.root.querySelector<HTMLElement>('.center-notice')!
    notice.textContent = text
    notice.classList.add('show')
    window.clearTimeout(this.noticeTimer)
    this.noticeTimer = window.setTimeout(() => notice.classList.remove('show'), 950)
  }

  fatal(message: string): void {
    this.setBootProgress(1, `Falha ao iniciar: ${message}`)
  }

  private onClick(event: MouseEvent): void {
    const vehicle = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-vehicle]')
    if (vehicle?.dataset.vehicle) {
      this.actions.selectVehicle(vehicle.dataset.vehicle as BrazilianTrafficModel)
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
      case 'garage': this.showGarage('gol-g5'); break
      case 'garage-back': this.show(this.returnAfterGarage); break
      case 'back': this.show(this.returnAfterBoard); break
    }
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
    <div class="title-actions"><button class="game-btn primary" data-action="play">${copy['menu.play']} <span>↗</span></button><button class="game-btn" data-action="garage">GARAGEM <span>↗</span></button><button class="game-btn" data-action="leaderboard">${copy['menu.leaderboard']} <span>↗</span></button></div>
  </div>
  <div class="title-best">RECORDE LOCAL <b class="title-best-value">0</b></div>
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
  <div class="modal-menu"><button class="game-btn primary" data-action="resume">${copy['menu.resume']}</button><button class="game-btn" data-action="restart">${copy['menu.restart']}</button><button class="game-btn" data-action="garage">GARAGEM</button><button class="game-btn" data-action="leaderboard">${copy['menu.leaderboard']}</button><button class="game-btn" data-action="title">${copy['menu.title']}</button></div>
</div></section>
<section class="screen screen-modal" data-screen="results"><div class="modal"><div class="eyebrow">ASFALTO · RESULTADO</div><h2>${copy['results.title']}</h2><div class="record-badge">${copy['results.best']}</div>
  <div class="result-caption">${copy['results.score']}</div><div class="result-score">0</div><div class="result-grid"><div>${copy['results.distance']}<b class="result-distance">0,00 KM</b></div><div>${copy['results.nearMiss']}<b class="result-near-misses">0</b></div></div><div class="modal-tag result-note"></div>
  <div class="modal-menu"><button class="game-btn primary" data-action="restart">${copy['results.retry']}</button><button class="game-btn" data-action="leaderboard">${copy['results.leaderboard']}</button><button class="game-btn" data-action="title">${copy['menu.title']}</button></div>
</div></section>
<section class="screen screen-modal" data-screen="garage"><div class="modal garage-modal"><div class="eyebrow">ASFALTO · GARAGEM</div><h2>ESCOLHA SEU CARRO</h2><p>Selecione o veículo que vai encarar o trânsito.</p><div class="garage-grid"></div><div class="modal-menu"><button class="game-btn" data-action="garage-back">VOLTAR</button></div></div></section>
<section class="screen screen-modal" data-screen="leaderboard"><div class="modal"><div class="eyebrow">ASFALTO · RECORDES</div><h2>${copy['leaderboard.title']}</h2><div class="board-source">${copy['leaderboard.local']}</div><ol class="score-list"><li class="score-empty">${copy['leaderboard.empty']}</li></ol>
  <div class="modal-menu"><button class="game-btn" data-action="back">${copy['menu.back']}</button></div>
</div></section>
<div class="touch" aria-hidden="true"><div class="touch-stick"><i></i></div><div class="touch-actions"><button class="touch-btn" data-touch="sprint">${copy['touch.accelerate']}</button><button class="touch-btn" data-touch="dash">${copy['touch.nitro']}</button></div></div>
`
  }
}
