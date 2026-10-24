import { Route, Routes } from 'react-router'
import { useAuth } from './auth.js'
import Layout from './Layout.jsx'
import LoginPage from './LoginPage.jsx'
import NotFound from './NotFound.jsx'
import { featureRoutes } from './featureRoutes.js'

export default function App() {
  const { status } = useAuth()
  // In database mode nothing internal is shown until the user is signed in (FR-1).
  if (status !== 'signed-in') return <LoginPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        {featureRoutes.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
