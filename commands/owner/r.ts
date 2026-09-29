import { db } from '#db';
import cp from 'child_process'
import { promisify } from 'util'
const exec = promisify(cp.exec)

export default {
    command: ['r', 'exec', '>'],
    owner: true,
    run: async (ctx: any) => {
        const { msg, args, reply, chat } = ctx;

        const cmd = args.join(' ').trim()
        if (!cmd) {
            return reply('❌ Escribe algo bro\nEj: .r npm install jimp')
        }

        await reply(`⏳ Ejecutando: \`${cmd}\`...`)

        try {
            const { stdout, stderr } = await exec(cmd, { timeout: 60000 })
            let out = ''
            if (stdout?.trim()) out += `✅ STDOUT:\n${stdout.trim().slice(0, 3500)}\n\n`
            if (stderr?.trim()) out += `⚠️ STDERR:\n${stderr.trim().slice(0, 3500)}`
            if (!out) out = '✅ Hecho, sin salida.'
            return reply(out)
        } catch (e: any) {
            let errorMsg = e.stdout || e.stderr || e.message || 'Error desconocido'
            return reply(`❌ ERROR:\n${String(errorMsg).slice(0, 3500)}`)
        }
    }
};