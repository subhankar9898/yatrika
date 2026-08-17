import { useState, useEffect, useRef, useCallback } from 'react'
import { FiRefreshCw } from 'react-icons/fi'

// Generates a random integer between min and max (inclusive)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Generates a simple addition challenge: a + b = ?
const generateChallenge = () => {
    const a = rand(1, 20)
    const b = rand(1, 20)
    return { question: `${a} + ${b} = ?`, answer: String(a + b) }
}

// Draw CAPTCHA on canvas with distortion
const drawCaptcha = (canvas, text) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    // Background
    ctx.fillStyle = '#f0fdf4'
    ctx.fillRect(0, 0, w, h)

    // Noise lines
    for (let i = 0; i < 6; i++) {
        ctx.beginPath()
        ctx.moveTo(rand(0, w), rand(0, h))
        ctx.lineTo(rand(0, w), rand(0, h))
        ctx.strokeStyle = `hsla(${rand(140, 160)}, 60%, 70%, 0.5)`
        ctx.lineWidth = 1.5
        ctx.stroke()
    }

    // Noise dots
    for (let i = 0; i < 30; i++) {
        ctx.beginPath()
        ctx.arc(rand(0, w), rand(0, h), rand(1, 3), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${rand(140, 160)}, 60%, 60%, 0.4)`
        ctx.fill()
    }

    // Draw text with slight rotation per character
    const chars = text.split('')
    let x = 14
    chars.forEach((ch) => {
        ctx.save()
        ctx.translate(x, h / 2 + rand(-4, 4))
        ctx.rotate((rand(-15, 15) * Math.PI) / 180)
        ctx.font = `bold ${rand(20, 26)}px 'Courier New', monospace`
        ctx.fillStyle = `hsl(${rand(140, 160)}, 70%, ${rand(20, 40)}%)`
        ctx.fillText(ch, 0, 0)
        ctx.restore()
        x += rand(18, 26)
    })
}

export default function HumanCaptcha({ onVerified, onReset }) {
    const [challenge, setChallenge] = useState(null)
    const [userAnswer, setUserAnswer] = useState('')
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState('')
    const [shake, setShake] = useState(false)
    const canvasRef = useRef(null)


    const refresh = useCallback(() => {
        const c = generateChallenge()
        setChallenge(c)
        setUserAnswer('')
        setError('')
        setVerified(false)
        if (onReset) onReset()
    }, [onReset])

    // Generate on mount
    useEffect(() => { refresh() }, [])

    // Draw on canvas whenever question changes
    useEffect(() => {
        if (challenge && canvasRef.current) {
            drawCaptcha(canvasRef.current, challenge.question)
        }
    }, [challenge])

    const handleVerify = () => {
        const trimmed = userAnswer.trim().toLowerCase()
        const correct = challenge.answer.toLowerCase()
        if (trimmed === correct) {
            setVerified(true)
            setError('')
            if (onVerified) onVerified()
        } else {
            setError('Incorrect answer. Try again.')
            setShake(true)
            setTimeout(() => setShake(false), 500)
            refresh()
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleVerify() }
    }

    return (
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 transition-colors">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                Human Verification
            </p>

            {verified ? (
                <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm py-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-xs">✓</span>
                    Verified — you're human!
                </div>
            ) : (
                <>
                    {/* Canvas challenge */}
                    <div className="flex items-center gap-2 mb-3">
                        <canvas
                            ref={canvasRef}
                            width={220}
                            height={52}
                            className="rounded-lg border border-slate-200 shadow-sm select-none"
                        />
                        <button
                            type="button"
                            onClick={refresh}
                            className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50"
                            title="New challenge"
                        >
                            <FiRefreshCw size={16} />
                        </button>
                    </div>

                    {/* Answer input */}
                    <div className={`flex gap-2 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
                        <input
                            type="text"
                            value={userAnswer}
                            onChange={e => setUserAnswer(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="input flex-1 text-sm bg-white"
                            placeholder="Your answer"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={!userAnswer.trim()}
                            className="btn-primary py-2 px-4 text-sm whitespace-nowrap disabled:opacity-40"
                        >
                            Verify
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>
                    )}
                </>
            )}
        </div>
    )
}
