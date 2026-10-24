// Sign-in context shared by the app. The provider lives in AuthProvider.jsx.
import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export const SAMPLE_AUTH = { status: 'signed-in', isSample: true, user: null, role: 'owner', fullName: 'Sample data', error: '' }

// Outside an AuthProvider (e.g. a feature test rendering one page) the app behaves as in
// sample mode: Owner, no sign-in.
export function useAuth() {
  return useContext(AuthContext) ?? { ...SAMPLE_AUTH, signIn: async () => {}, signOut: async () => {} }
}
