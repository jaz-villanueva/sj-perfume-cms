import { Route, Routes } from 'react-router'
import Layout from './Layout.jsx'
import NotFound from './NotFound.jsx'
import { featureRoutes } from './featureRoutes.js'

export default function App() {
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
