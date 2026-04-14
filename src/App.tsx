import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ConfiguratorPage from './pages/ConfiguratorPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConfiguratorPage />} />
        <Route path="/bestill" element={<ConfiguratorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
