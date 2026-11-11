
import { Route, Routes } from 'react-router'
import { useAuth } from './auth.js'
import Layout from './Layout.jsx'
import LoginPage from './LoginPage.jsx'
import NotFound from './NotFound.jsx'
import CatalogPage from '../features/catalog/CatalogPage.jsx'
import { featureRoutes } from './featureRoutes.js'

// Protect all internal CMS routes.
function ProtectedRoutes() {
  const { status } = useAuth()

  if (status !== 'signed-in') {
    return <LoginPage />
  }

  return <Layout />
}

// Show the Catalog with the CMS sidebar for signed-in
// users, and without it for guests.
function CatalogRoute() {
  const { status } = useAuth()

  if (status === 'signed-in') {
    return <Layout />
  }

  return <CatalogPage />
}

export default function App() {
  return (
    <Routes>
      {/* Catalog is accessible to guests and employees */}
      <Route path="/catalog" element={<CatalogRoute />}>
        <Route index element={<CatalogPage />} />
      </Route>

      {/* All other CMS modules require authentication */}
      <Route element={<ProtectedRoutes />}>
        {featureRoutes
          .filter(({ path }) => path !== '/catalog')
          .map(({ path, Component }) => (
            <Route
              key={path}
              path={path}
              element={<Component />}
            />
          ))}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
