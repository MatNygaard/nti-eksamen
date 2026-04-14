import confetti from 'canvas-confetti'

export function useConfetti() {
  const fireConfetti = () => {
    // Første burst — fra venstre
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: ['#E63312', '#CC2A0F', '#111827', '#6B7280', '#ffffff'],
      gravity: 1.2,
      scalar: 0.9,
      drift: 0.2,
    })

    // Andre burst — fra høyre (liten delay)
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#E63312', '#CC2A0F', '#111827', '#6B7280', '#ffffff'],
        gravity: 1.2,
        scalar: 0.9,
        drift: -0.2,
      })
    }, 150)

    // Tredje burst — fra midten, kun NTI-røde
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 90,
        spread: 70,
        origin: { x: 0.5, y: 1 },
        colors: ['#E63312', '#FEF2F2', '#CC2A0F'],
        gravity: 0.8,
        scalar: 1.1,
        shapes: ['circle'],
      })
    }, 300)
  }

  return { fireConfetti }
}
