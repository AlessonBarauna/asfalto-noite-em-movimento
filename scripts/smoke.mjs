// End-to-end smoke test for the traffic-dodging game; requires `pnpm build` first.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const port = 4300 + Math.floor(Math.random() * 500)
const url = `http://127.0.0.1:${port}/`
const out = process.env.SHOTS_DIR ?? 'shots'
mkdirSync(out, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
let browser
const guard = setTimeout(() => fail('tempo limite excedido'), 120_000)

function cleanup() {
  clearTimeout(guard)
  try { server.kill('SIGTERM') } catch {}
}
async function fail(message) {
  console.error(`smoke: FALHA — ${message}`)
  await browser?.close().catch(() => {})
  cleanup()
  process.exit(1)
}
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(url)).ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('preview não iniciou')
}
async function openGame(context, errors) {
  const page = await context.newPage()
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', error => errors.push(String(error)))
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`) })
  await page.goto(url)
  await page.waitForSelector('[data-screen="title"].is-active', { timeout: 30_000 })
  const landing = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, ready: document.fonts.status }))
  if (landing.lang !== 'pt-BR') throw new Error(`idioma do jogo não é pt-BR (${landing.lang})`)
  if (!landing.title.includes('Asfalto')) throw new Error(`título HTML inesperado: ${landing.title}`)
  await page.waitForTimeout(700)
  return page
}
const state = page => page.evaluate(() => {
  const { game, ui, save } = window.__game
  return { mode: game.mode, screen: ui.screen, distance: game['distance'], x: game['x'], speed: game['speed'], board: save.data.leaderboard.length }
})

try {
  await waitForServer()
  browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'] })
  const errors = []
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'pt-BR' })
  const page = await openGame(context, errors)
  await page.screenshot({ path: `${out}/01-inicio.png` })

  await page.fill('.driver-name', 'TURBO TESTE')
  await page.keyboard.press('Enter')
  if ((await state(page)).mode !== 'title') throw new Error('Enter no nome iniciou a corrida indevidamente')
  await page.click('[data-action="play"]')
  await page.waitForSelector('[data-screen="hud"].is-active')
  const start = await state(page)
  await page.keyboard.down('KeyW')
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(650)
  await page.keyboard.up('KeyD')
  await page.keyboard.up('KeyW')
  await page.waitForTimeout(250)
  const moving = await state(page)
  if (moving.mode !== 'playing' || moving.distance <= start.distance + 8 || Math.abs(moving.x - start.x) < 0.7) {
    throw new Error(`direção/aceleração não avançaram como esperado: ${JSON.stringify({ start, moving })}`)
  }
  await page.screenshot({ path: `${out}/02-corrida.png` })

  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-screen="pause"].is-active')
  if ((await state(page)).mode !== 'paused') throw new Error('Escape não pausou a corrida')
  await page.screenshot({ path: `${out}/03-pausa.png` })
  await page.click('[data-screen="pause"] [data-action="resume"]')
  await page.waitForSelector('[data-screen="hud"].is-active')
  await page.waitForTimeout(200)

  // Cause a normal in-game collision with the deterministic traffic pool to exercise the real result flow.
  await page.evaluate(() => {
    const game = window.__game.game
    game['x'] = 0
    game['player'].position.x = 0
    game['distance'] = 1250
    game['lives'] = 1
    game['invulnerable'] = 0
    const car = game['traffic'][0]
    car.lane = 1
    car.tagged = false
    car.active = true
    car.root.position.set(0, 0.02, game['player'].position.z)
    car.root.visible = true
    game.step(1 / 60)
  })
  await page.waitForSelector('[data-screen="results"].is-active', { timeout: 10_000 })
  const result = await state(page)
  if (result.mode !== 'ended' || result.board < 1) throw new Error(`fim de jogo/recorde local não funcionou: ${JSON.stringify(result)}`)
  await page.screenshot({ path: `${out}/04-resultado.png` })
  await page.click('[data-screen="results"] [data-action="leaderboard"]')
  await page.waitForSelector('[data-screen="leaderboard"].is-active')
  const scoreText = await page.locator('.board-score').first().innerText()
  if (Number(scoreText.replace(/\./g, '')) < 12500) throw new Error(`placar local não exibiu a pontuação esperada: ${scoreText}`)
  const boardText = await page.locator('.score-list').innerText()
  if (!boardText.includes('TURBO TESTE')) throw new Error(`o nome de piloto não apareceu no placar: ${boardText}`)
  await page.screenshot({ path: `${out}/05-recordes.png` })
  await page.click('[data-screen="leaderboard"] [data-action="back"]')
  await page.waitForSelector('[data-screen="results"].is-active')
  await page.click('[data-screen="results"] [data-action="title"]')
  await page.waitForSelector('[data-screen="title"].is-active')
  await context.close()

  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' })
  const phonePage = await openGame(phone, errors)
  await phonePage.tap('[data-screen="title"] [data-action="play"]')
  await phonePage.waitForSelector('[data-screen="hud"].is-active')
  const mobileStart = await state(phonePage)
  const accelerate = phonePage.locator('[data-touch="sprint"]')
  await accelerate.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 })
  await phonePage.waitForTimeout(550)
  await accelerate.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 })
  const mobileAfter = await state(phonePage)
  if (mobileAfter.distance <= mobileStart.distance) throw new Error('controle tátil não acelerou')
  await phonePage.screenshot({ path: `${out}/06-celular.png` })
  await phone.close()

  if (errors.length) throw new Error(`erros do navegador:\n  ${errors.join('\n  ')}`)
  await browser.close()
  cleanup()
  console.log(`smoke: OK — distância ${moving.distance.toFixed(0)} m, desvio lateral ${moving.x.toFixed(2)} m, screenshots em ${out}/`)
} catch (error) {
  await fail(error?.message ?? String(error))
}
