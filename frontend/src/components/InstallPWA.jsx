import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

function InstallPWA() {
  const { i18n } = useTranslation()
  const isEn = (i18n.language || 'es').startsWith('en')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('Usuario instaló la PWA')
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  if (!isInstallable) return null

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors z-50 flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">download</span>
      {isEn ? 'Install App' : 'Instalar App'}
    </button>
  )
}

export default InstallPWA