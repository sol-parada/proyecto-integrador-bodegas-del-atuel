import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { CatalogoPage } from './features/vinos/CatalogoPage'
import { VinoFormPage } from './features/vinos/VinoFormPage'

function VinoFormRoute() {
  const { codVino } = useParams()
  return <VinoFormPage key={codVino ?? 'nuevo'} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route element={<Navigate replace to="/vinos" />} path="/" />
          <Route element={<CatalogoPage />} path="/vinos" />
          <Route element={<VinoFormRoute />} path="/vinos/nuevo" />
          <Route element={<VinoFormRoute />} path="/vinos/:codVino/editar" />
          <Route element={<Navigate replace to="/vinos" />} path="*" />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}
