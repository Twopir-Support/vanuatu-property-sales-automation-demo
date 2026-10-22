import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import ZapHistory from './pages/ZapHistory'
import Zaps from './pages/Zaps'
import { DemoStoreProvider } from './store/DemoStore'

// Zapier-only preview: the Zaps editor and Zap history. HashRouter keeps deep links working on any static host.
export default function App() {
  return (
    <DemoStoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Zaps />} />
            <Route path="history" element={<ZapHistory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DemoStoreProvider>
  )
}
