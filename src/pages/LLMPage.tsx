import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LLMPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to SEO page with AI visibility tab
    navigate('/seo', { replace: true })
  }, [navigate])

  return null
}




