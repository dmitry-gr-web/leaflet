import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080
const PATH = process.env.WS_PATH ?? '/ws'

const PRIMARY_KEY = process.env.API_KEY ?? 'demo-key'
const EXTRA_KEYS = (process.env.API_KEYS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

// Для демо дозволяємо ще один ключ ("інший юзер")
const VALID_KEYS = new Set([PRIMARY_KEY, 'demo-key', ...EXTRA_KEYS])

process.on('uncaughtException', (err) => {
    console.error('Неперехоплена помилка (uncaughtException):', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Неперехоплене відхилення проміса (unhandledRejection):', err)
})

function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function createState({ center, count, seed }) {
    const rand = mulberry32(seed)
    const state = new Map()
    for (let i = 0; i < count; i++) {
        const id = `obj-${i + 1}`
        const lat = center[0] + (rand() - 0.5) * 0.2
        const lng = center[1] + (rand() - 0.5) * 0.2
        const headingDeg = rand() * 360
        const speed = 0.0005 + rand() * 0.0015
        state.set(id, {
            lat,
            lng,
            headingDeg,
            speed,
            isDead: false,
        })
    }
    return { rand, state }
}

const server = http.createServer((req, res) => {
    if (!req.url) {
        res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('Bad request')
        return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)

    // ---- HTTP керування (для фронта): POST /reset ----
    if (url.pathname === '/reset') {
        // ---- CORS лише для /reset (корисно для прод/не-проксі сценаріїв) ----
        const origin = req.headers.origin
        const isAllowedOrigin =
            typeof origin === 'string' &&
            (origin.startsWith('http://localhost:') ||
                origin.startsWith('http://127.0.0.1:') ||
                origin.startsWith('http://[::1]:') ||
                origin === 'null')

        if (isAllowedOrigin && origin) {
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
        }

        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'content-type, x-api-key')

        // preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
        }

        if (req.method !== 'POST') {
            res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }))
            return
        }

        const key = req.headers['x-api-key'] || url.searchParams.get('key')
        if (!VALID_KEYS.has(String(key))) {
            res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: false, error: 'unauthorized' }))
            return
        }

        const countRaw = url.searchParams.get('count') ?? req.headers['x-sim-count']
        const desiredCount = parseCount(countRaw)
        const nextCount = resetSim(desiredCount ?? SIM_COUNT)

        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, count: nextCount }))
        return
    }

    // дефолтна відповідь
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('WS server is running. Connect via WebSocket on ' + PATH + '\n')
})

const wss = new WebSocketServer({ server, path: PATH })

// ---- Глобальна симуляція + broadcast для багатьох клієнтів ----
let SIM_COUNT = process.env.SIM_COUNT ? Number(process.env.SIM_COUNT) : 100 + Math.floor(mulberry32(42)() * 101)
if (Number.isNaN(SIM_COUNT) || SIM_COUNT <= 0) {
    SIM_COUNT = 100 + Math.floor(mulberry32(42)() * 101)
}
console.log('SIM_COUNT:', SIM_COUNT, '(env SIM_COUNT =', process.env.SIM_COUNT ?? 'unset', ')')

const SIM_CENTER = [50.4501, 30.5234]

// Симуляція окремо для кожного count (щоб "завжди стільки, скільки вказав клієнт")
// key: count, value: { rand, state }
const simsByCount = new Map()

function getOrCreateSim(count) {
    const c = Number.isFinite(count) && count > 0 ? Math.floor(count) : SIM_COUNT
    const existing = simsByCount.get(c)
    if (existing) return { count: c, sim: existing }

    const created = createState({ center: SIM_CENTER, count: c, seed: 42 + c })
    const sim = { rand: created.rand, state: created.state }
    simsByCount.set(c, sim)
    return { count: c, sim }
}

function resetSim(count) {
    const c = Number.isFinite(count) && count > 0 ? Math.floor(count) : SIM_COUNT
    const created = createState({ center: SIM_CENTER, count: c, seed: Date.now() % 2147483647 })
    const sim = { rand: created.rand, state: created.state }
    simsByCount.set(c, sim)
    return c
}

function parseCount(raw) {
    const n = raw == null ? NaN : Number(raw)
    if (!Number.isFinite(n)) return null
    const c = Math.floor(n)
    if (c <= 0) return null
    // захист від випадкового вводу "1000000"
    return Math.min(2000, c)
}

function buildTickItemsForSim(sim, tickMs) {
    const items = []

    const TICK_MS = tickMs
    const TARGET_DEAD_PER_SEC = process.env.TARGET_DEAD_PER_SEC ? Number(process.env.TARGET_DEAD_PER_SEC) : 0.3
    const targetDeadPerTick = Number.isFinite(TARGET_DEAD_PER_SEC) ? (TARGET_DEAD_PER_SEC * TICK_MS) / 1000 : 0.3

    const aliveCount = Array.from(sim.state.values()).filter((s) => !s.isDead).length
    const pDead = aliveCount > 0 ? Math.min(1, targetDeadPerTick / aliveCount) : 0

    for (const [id, s] of sim.state.entries()) {
        if (!s.isDead && sim.rand() < pDead) {
            s.isDead = true
        }

        if (s.isDead) continue

        s.headingDeg = (s.headingDeg + (sim.rand() - 0.5) * 10 + 360) % 360
        const rad = (s.headingDeg * Math.PI) / 180
        s.lat += Math.sin(rad) * s.speed
        s.lng += Math.cos(rad) * s.speed

        items.push({ id, lat: s.lat, lng: s.lng, headingDeg: s.headingDeg })
    }

    return items
}

function ensureSimHasAlive(count) {
    const { sim } = getOrCreateSim(count)
    const aliveCount = Array.from(sim.state.values()).filter((s) => !s.isDead).length
    if (aliveCount > 0) return
    // якщо всі "вимерли" — пересоздаємо симуляцію для цієї кімнати
    resetSim(count)
}

const broadcastTimer = setInterval(() => {
    const TICK_MS = 1000

    for (const client of wss.clients) {
        if (client.readyState !== 1) continue
        const count = client.__simCount ?? SIM_COUNT
        const { sim } = getOrCreateSim(count)
        const items = buildTickItemsForSim(sim, TICK_MS)
        const payload = JSON.stringify({ type: 'objects', items })

        try {
            client.send(payload)
        } catch (err) {
            // ignore
        }
    }
}, 1000)

wss.on('close', () => clearInterval(broadcastTimer))

wss.on('listening', () => {
    console.log('WS сервер слухає підключення на шляху:', PATH)
})

wss.on('error', (err) => {
    console.error('Помилка WebSocketServer:', err)
})

wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`)
    const key = url.searchParams.get('key')
    const remote = req.socket?.remoteAddress
    const desiredCount = parseCount(url.searchParams.get('count'))

    // зберігаємо count на сокеті
    ws.__simCount = desiredCount ?? SIM_COUNT

    console.log('Нове WS підключення:', { remote, path: url.pathname, hasKey: Boolean(key), count: ws.__simCount })

    ws.on('error', (err) => {
        console.error('Помилка WS з’єднання:', { remote, err })
    })

    ws.on('close', (code, reason) => {
        console.log('WS закрито:', { remote, code, reason: reason?.toString?.() })
    })

    if (!VALID_KEYS.has(String(key))) {
        console.warn('Відхилено підключення: невірний ключ', { remote, key })
        ws.send(JSON.stringify({ type: 'error', message: 'unauthorized' }))
        ws.close(1008, 'unauthorized')
        return
    }

    // якщо в кімнаті вже 0 живих об'єктів — пересоздаємо при вході нового клієнта
    ensureSimHasAlive(ws.__simCount)

    console.log('Клієнт авторизований, підписано на broadcast:', { remote, count: ws.__simCount })

    // одразу віддаємо 1-й снапшот
    try {
        const { sim } = getOrCreateSim(ws.__simCount)
        ws.send(JSON.stringify({ type: 'objects', items: buildTickItemsForSim(sim, 1000) }))
    } catch (err) {
        console.error('Не вдалося надіслати початковий снапшот клієнту:', { remote, err })
    }
})

// УВАГА: /reset обробляється всередині http.createServer вище.
// (remove legacy server.on('request') handler to avoid ERR_HTTP_HEADERS_SENT)

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Порт ${PORT} вже зайнятий. Зупиніть попередній процес або змініть PORT.`)
        process.exit(1)
    }
    console.error('Помилка сервера:', err)
    process.exit(1)
})

server.listen(PORT, () => {
    console.log(`WS server: ws://localhost:${PORT}${PATH}  (keys=${Array.from(VALID_KEYS).join(',')})`)
})
