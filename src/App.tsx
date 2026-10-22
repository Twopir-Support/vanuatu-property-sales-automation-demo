import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { InvoiceEditor, InvoicesList } from './pages/Accounting'
import Contracts from './pages/Contracts'
import { ContactRecord, CrmIndex, DealRecord } from './pages/Crm'
import Documents from './pages/Documents'
import LotSales from './pages/LotSales'
import Monitor from './pages/Monitor'
import Overview from './pages/Overview'
import Roadmap from './pages/Roadmap'
import Settings from './pages/Settings'
import Workflow from './pages/Workflow'
import { DemoStoreProvider } from './store/DemoStore'

// HashRouter keeps deep links working on any static host (GitHub Pages, S3, file share).
export default function App() {
  return (
    <DemoStoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="lots" element={<LotSales />} />
            <Route path="workflow" element={<Workflow />} />
            <Route path="crm" element={<CrmIndex />} />
            <Route path="crm/deal" element={<DealRecord />} />
            <Route path="crm/contact" element={<ContactRecord />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/:folderId" element={<Documents />} />
            <Route path="accounting" element={<InvoicesList />} />
            <Route path="accounting/invoice" element={<InvoiceEditor />} />
            <Route path="monitor" element={<Monitor />} />
            <Route path="roadmap" element={<Roadmap />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DemoStoreProvider>
  )
}
