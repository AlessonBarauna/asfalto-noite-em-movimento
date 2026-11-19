import type { Audio } from './audio'

/**
 * Paisagem sonora 100% sintetizada (sem arquivos de áudio): motor com marchas, vento, rodagem,
 * ambiente de cada cenário, buzinas de fundo, efeitos de pulo/batida/nitro e uma trilha que
 * acelera conforme o nível. Tudo passa pelos barramentos de música e efeitos do `Audio`.
 */
export type SoundScene = 'cidade' | 'serra' | 'deserto'

export type SoundState = {
  /** Velocidade em m/s (0 no menu). */
  speed: number
  /** 0..1 — quanto o jogador está acelerando. */
  throttle: number
  boosting: boolean
  /** true só durante a corrida (motor e vento ligados). */
  driving: boolean
  level: number
  airborne: boolean
}

const MUSIC: Record<SoundScene, { bpm: number; roots: number[]; hats: boolean; kick: boolean; lead: number[] }> = {
  cidade: { bpm: 98, roots: [55, 43.65, 65.41, 49], hats: true, kick: true, lead: [0, 3, 7, 10, 12, 10, 7, 3] },
  serra: { bpm: 84, roots: [49, 41.2, 55, 46.25], hats: false, kick: true, lead: [0, 7, 12, 7, 15, 12, 7, 3] },
  deserto: { bpm: 90, roots: [58.27, 51.91, 65.41, 49], hats: true, kick: false, lead: [0, 2, 5, 7, 9, 7, 5, 2] },
}

export class Soundscape {
  private readonly ctx: AudioContext
  private readonly out: GainNode
  private readonly musicOut: GainNode
  private noise!: AudioBuffer
  private scene: SoundScene = 'cidade'
  private rain = false

  // motor
  private engGain!: GainNode
  private engFilter!: BiquadFilterNode
  private oscA!: OscillatorNode
  private oscB!: OscillatorNode
  private oscSub!: OscillatorNode
  private rpm = 900
  // vento / rodagem
  private windGain!: GainNode
  private windFilter!: BiquadFilterNode
  private roadGain!: GainNode
  // ambiente
  private ambGain!: GainNode
  private ambFilter!: BiquadFilterNode
  private rainGain!: GainNode
  private cricketGain!: GainNode
  private gustLfo!: GainNode
  private boostGain!: GainNode
  private hornTimer = 8
  private screechCooldown = 0
  private beat = 0
  private nextBeatAt = 0
  private level = 1
  private started = false
  private timer = 0
  private musicDuck = 1

  constructor(audio: Audio) {
    this.ctx = audio.ctx
    this.out = audio.sfxBus
    this.musicOut = audio.musicBus
  }

  /** Cria as vozes contínuas. Seguro chamar mais de uma vez. */
  start(): void {
    if (this.started) return
    this.started = true
    const ctx = this.ctx
    this.noise = this.makeNoise()

    // Motor: dente de serra + quadrada + subgrave, filtrados; "waveshaper" suave dá grão.
    this.oscA = ctx.createOscillator(); this.oscA.type = 'sawtooth'
    this.oscB = ctx.createOscillator(); this.oscB.type = 'square'
    this.oscSub = ctx.createOscillator(); this.oscSub.type = 'sine'
    const shaper = ctx.createWaveShaper()
    const curve = new Float32Array(256)
    for (let i = 0; i < 256; i += 1) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 2.2) }
    shaper.curve = curve
    this.engFilter = ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.Q.value = 2.2
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0
    const mixB = ctx.createGain(); mixB.gain.value = 0.35
    const mixS = ctx.createGain(); mixS.gain.value = 0.9
    this.oscA.connect(shaper); this.oscB.connect(mixB).connect(shaper); this.oscSub.connect(mixS).connect(shaper)
    shaper.connect(this.engFilter).connect(this.engGain).connect(this.out)
    for (const o of [this.oscA, this.oscB, this.oscSub]) o.start()

    // Vento (faixa média) e rodagem no asfalto (grave).
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.Q.value = 0.7
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0
    this.loopNoise().connect(this.windFilter).connect(this.windGain).connect(this.out)
    const roadFilter = ctx.createBiquadFilter(); roadFilter.type = 'lowpass'; roadFilter.frequency.value = 220
    this.roadGain = ctx.createGain(); this.roadGain.gain.value = 0
    this.loopNoise().connect(roadFilter).connect(this.roadGain).connect(this.out)

    // Nitro: sopro contínuo que só abre durante o boost.
    const boostFilter = ctx.createBiquadFilter(); boostFilter.type = 'highpass'; boostFilter.frequency.value = 1400
    this.boostGain = ctx.createGain(); this.boostGain.gain.value = 0
    this.loopNoise().connect(boostFilter).connect(this.boostGain).connect(this.out)

    // Ambiente: leito de ruído + rajadas (LFO) + chuva + grilos.
    this.ambFilter = ctx.createBiquadFilter(); this.ambFilter.type = 'lowpass'; this.ambFilter.frequency.value = 160
    this.ambGain = ctx.createGain(); this.ambGain.gain.value = 0
    this.loopNoise().connect(this.ambFilter).connect(this.ambGain).connect(this.out)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11
    this.gustLfo = ctx.createGain(); this.gustLfo.gain.value = 0
    lfo.connect(this.gustLfo).connect(this.ambGain.gain); lfo.start()

    const rainFilter = ctx.createBiquadFilter(); rainFilter.type = 'highpass'; rainFilter.frequency.value = 2400
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0
    this.loopNoise().connect(rainFilter).connect(this.rainGain).connect(this.out)

    const cricket = ctx.createOscillator(); cricket.type = 'sine'; cricket.frequency.value = 4300
    const cricketAm = ctx.createGain(); cricketAm.gain.value = 0
    const cricketLfo = ctx.createOscillator(); cricketLfo.type = 'square'; cricketLfo.frequency.value = 23
    const cricketDepth = ctx.createGain(); cricketDepth.gain.value = 0.5
    cricketLfo.connect(cricketDepth).connect(cricketAm.gain)
    this.cricketGain = ctx.createGain(); this.cricketGain.gain.value = 0
    cricket.connect(cricketAm).connect(this.cricketGain).connect(this.out)
    cricket.start(); cricketLfo.start()

    this.applyScene()
    this.nextBeatAt = ctx.currentTime + 0.2
    this.timer = window.setInterval(() => this.scheduleMusic(), 90)
  }

  dispose(): void {
    window.clearInterval(this.timer)
  }

  setScene(scene: SoundScene, rain: boolean): void {
    this.scene = scene
    this.rain = rain
    if (this.started) this.applyScene()
  }

  private applyScene(): void {
    const t = this.ctx.currentTime
    const city = this.scene === 'cidade'
    const serra = this.scene === 'serra'
    this.ambFilter.frequency.setTargetAtTime(city ? 150 : serra ? 520 : 380, t, 0.3)
    this.ambGain.gain.setTargetAtTime(city ? 0.06 : serra ? 0.05 : 0.045, t, 0.4)
    this.gustLfo.gain.setTargetAtTime(city ? 0.005 : serra ? 0.03 : 0.04, t, 0.4)
    this.rainGain.gain.setTargetAtTime(this.rain ? 0.05 : 0, t, 0.5)
    this.cricketGain.gain.setTargetAtTime(serra ? 0.006 : 0, t, 0.5)
  }

  /** Chamar todo quadro. */
  update(dt: number, s: SoundState): void {
    if (!this.started) return
    const t = this.ctx.currentTime
    this.level = s.level
    const speed = s.driving ? s.speed : 0

    // Marchas: cada marcha cobre uma faixa de velocidade 1,5× maior que a anterior.
    let gearLow = 0
    let gearHigh = 13
    while (speed > gearHigh && gearHigh < 400) { gearLow = gearHigh; gearHigh *= 1.5 }
    const ratio = Math.min(1, Math.max(0, (speed - gearLow) / (gearHigh - gearLow)))
    const targetRpm = 1000 + ratio * 5000 + s.throttle * 500 + (s.boosting ? 450 : 0)
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * (targetRpm < this.rpm ? 9 : 5))
    const freq = (this.rpm / 60) * 2.2
    this.oscA.frequency.setTargetAtTime(freq, t, 0.03)
    this.oscB.frequency.setTargetAtTime(freq * 1.004, t, 0.03)
    this.oscSub.frequency.setTargetAtTime(freq * 0.5, t, 0.03)
    this.engFilter.frequency.setTargetAtTime(380 + this.rpm * 0.55 + s.throttle * 500, t, 0.05)
    const load = s.driving ? 0.075 + s.throttle * 0.05 + ratio * 0.03 : 0
    this.engGain.gain.setTargetAtTime(s.airborne ? load * 1.25 : load, t, 0.08)

    const wind01 = Math.min(1, speed / 55)
    this.windFilter.frequency.setTargetAtTime(380 + wind01 * 1500, t, 0.2)
    this.windGain.gain.setTargetAtTime(s.driving ? 0.018 + wind01 * 0.11 : 0, t, 0.2)
    this.roadGain.gain.setTargetAtTime(s.driving && !s.airborne ? 0.04 + wind01 * 0.13 : 0, t, 0.1)
    this.boostGain.gain.setTargetAtTime(s.boosting ? 0.09 : 0, t, 0.08)

    // Buzinas de fundo, mais raras na estrada vazia.
    if (s.driving) {
      this.hornTimer -= dt
      if (this.hornTimer <= 0) {
        this.hornTimer = (this.scene === 'cidade' ? 5 : 14) + Math.random() * (this.scene === 'cidade' ? 11 : 20)
        this.horn((Math.random() - 0.5) * 1.6, 0.35 + Math.random() * 0.4)
      }
    }
    this.screechCooldown = Math.max(0, this.screechCooldown - dt)
  }

  /** Chamado quando o carro faz curva forte em alta velocidade. */
  screech(): void {
    if (this.screechCooldown > 0 || this.ctx.state !== 'running') return
    this.screechCooldown = 1.1
    const t = this.ctx.currentTime
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2400, t); f.frequency.linearRampToValueAtTime(1700, t + 0.4); f.Q.value = 6
    this.shot(f, 0.07, 0.4, 0.02)
  }

  jump(): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.28)
    this.shot(f, 0.16, 0.32, 0.03)
    this.tone(95, 55, 0.22, 'sine', 0.35)
  }

  land(): void {
    if (this.ctx.state !== 'running') return
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700
    this.shot(f, 0.3, 0.16, 0.003)
    this.tone(120, 38, 0.24, 'sine', 0.6)
    this.tone(70, 40, 0.3, 'triangle', 0.25)
  }

  crash(): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'
    f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.7)
    this.shot(f, 0.75, 0.75, 0.002)
    this.tone(85, 28, 0.6, 'sine', 0.85)
    this.tone(55, 30, 0.7, 'sawtooth', 0.22)
    for (let i = 0; i < 5; i += 1) this.tone(900 + Math.random() * 2600, 400 + Math.random() * 500, 0.12, 'square', 0.07, 0.02 + i * 0.045 + Math.random() * 0.03)
    this.musicDuck = 0.25
  }

  /** Carro cortando rente: ruído que desce de tom, com pan do lado em que ele passou. */
  passBy(pan: number): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.6
    f.frequency.setValueAtTime(2300, t); f.frequency.exponentialRampToValueAtTime(420, t + 0.45)
    this.shot(f, 0.4, 0.5, 0.05, pan)
    this.tone(260, 150, 0.4, 'sawtooth', 0.05, 0, pan)
  }

  horn(pan: number, vol = 0.5): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const base = this.scene === 'cidade' ? 410 : 360
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100
    const g = this.ctx.createGain()
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan))
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.045 * vol, t + 0.03)
    g.gain.setValueAtTime(0.045 * vol, t + 0.28)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
    lp.connect(g).connect(p).connect(this.out)
    for (const mult of [1, 1.26]) {
      const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = base * mult
      o.connect(lp); o.start(t); o.stop(t + 0.45)
    }
  }

  nitro(): void {
    if (this.ctx.state !== 'running') return
    const t = this.ctx.currentTime
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.6)
    this.shot(f, 0.3, 0.7, 0.05)
    this.tone(180, 520, 0.6, 'sawtooth', 0.12)
  }

  power(): void {
    if (this.ctx.state !== 'running') return
    ;[392, 587.33, 783.99, 1174.66].forEach((f, i) => this.tone(f, f * 1.01, 0.28, 'sine', 0.18, i * 0.06))
    this.tone(120, 360, 0.45, 'triangle', 0.1)
  }

  powerEnd(): void {
    if (this.ctx.state !== 'running') return
    ;[784, 523.25, 392].forEach((f, i) => this.tone(f, f * 0.98, 0.22, 'triangle', 0.13, i * 0.1))
  }

  levelUp(): void {
    if (this.ctx.state !== 'running') return
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, f * 1.003, 0.35, 'triangle', 0.16, i * 0.09))
  }

  // ---------- música ----------
  private scheduleMusic(): void {
    if (this.ctx.state !== 'running') { this.nextBeatAt = this.ctx.currentTime + 0.1; return }
    this.musicDuck += (1 - this.musicDuck) * 0.04
    const cfg = MUSIC[this.scene]
    const bpm = cfg.bpm + Math.min(44, (this.level - 1) * 5)
    const step = 60 / bpm / 2 // colcheias
    while (this.nextBeatAt < this.ctx.currentTime + 0.35) {
      this.playStep(cfg, this.beat, this.nextBeatAt, step)
      this.nextBeatAt += step
      this.beat += 1
    }
  }

  private playStep(cfg: (typeof MUSIC)[SoundScene], beat: number, t: number, step: number): void {
    const bar = Math.floor(beat / 16) % cfg.roots.length
    const root = cfg.roots[bar]
    const i = beat % 16
    const duck = this.musicDuck
    // baixo pulsando
    if (i % 2 === 0 || i % 8 === 7) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * (i % 8 === 7 ? 2 : 1)
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(180, t + step * 1.6)
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.17 * duck, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.8)
      o.connect(lp).connect(g).connect(this.musicOut); o.start(t); o.stop(t + step * 2)
    }
    // bumbo
    if (cfg.kick && i % 4 === 0) {
      const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.32 * duck, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      o.connect(g).connect(this.musicOut); o.start(t); o.stop(t + 0.22)
    }
    // chimbal
    if (cfg.hats && i % 2 === 1) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noise
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.07 * duck, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      src.connect(hp).connect(g).connect(this.musicOut); src.start(t, Math.random()); src.stop(t + 0.06)
    }
    // melodia suave na oitava alta (a cada colcheia par, notas da escala)
    if (i % 2 === 0 && (this.level >= 2 || i % 4 === 0)) {
      const semis = cfg.lead[(beat >> 1) % cfg.lead.length]
      const f = root * 4 * Math.pow(2, semis / 12)
      const o = this.ctx.createOscillator(); o.type = this.scene === 'deserto' ? 'triangle' : 'square'; o.frequency.value = f
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 * duck, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.9)
      o.connect(lp).connect(g).connect(this.musicOut); o.start(t); o.stop(t + step * 2)
    }
  }

  // ---------- utilidades ----------
  private makeNoise(): AudioBuffer {
    const len = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i += 1) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; data[i] = (w * 0.5 + last * 6) * 0.6 }
    return buf
  }

  private loopNoise(): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true; src.start(0, Math.random() * 1.5)
    return src
  }

  /** Rajada de ruído filtrado com envelope curto. */
  private shot(filter: BiquadFilterNode, vol: number, dur: number, attack: number, pan = 0): void {
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource(); src.buffer = this.noise
    const g = this.ctx.createGain()
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan))
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(p).connect(this.out)
    src.start(t, Math.random()); src.stop(t + dur + 0.05)
  }

  private tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0, pan = 0): void {
    const t = this.ctx.currentTime + delay
    const o = this.ctx.createOscillator(); o.type = type
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const g = this.ctx.createGain()
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan))
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(p).connect(this.out)
    o.start(t); o.stop(t + dur + 0.05)
  }
}
