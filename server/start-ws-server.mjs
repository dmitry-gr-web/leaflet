import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotEnv() {
    try {
        const envPath = resolve(process.cwd(), '.env')
        const raw = readFileSync(envPath, 'utf-8')

        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue

            const eq = trimmed.indexOf('=')
            if (eq === -1) continue

            const key = trimmed.slice(0, eq).trim()
            let val = trimmed.slice(eq + 1).trim()

            // прибираємо прості лапки/подвійні лапки
            if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
            ) {
                val = val.slice(1, -1)
            }

            if (!(key in process.env)) process.env[key] = val
        }
    } catch {
        // .env може бути відсутній
    }
}

loadDotEnv()

function freePort(port) {
    try {
        const out = execSync(`lsof -t -iTCP:${port} -sTCP:LISTEN`, { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim()

        if (!out) return

        const pids = out
            .split(/\s+/)
            .map((x) => x.trim())
            .filter(Boolean)

        for (const pid of pids) {
            try {
                process.kill(Number(pid), 'SIGTERM')
            } catch {
                // ігноруємо
            }
        }
    } catch {
        // ніхто не слухає порт або lsof недоступний
    }
}

const port = process.env.PORT ? Number(process.env.PORT) : 8080
freePort(port)

await import('./ws-server.mjs')
