import { createContext } from 'react'

/**
 * Valor: { status, user, signIn, signOut }
 *  - status: 'loading' (aún preguntando al backend) | 'authenticated' | 'unauthenticated'
 */
export const AuthContext = createContext(null)
