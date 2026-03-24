"use client"

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useGetProfileQuery } from '@/features/auth/authApi'

export default function ProtectedRoute({ children, roles }) {
  const { data, isLoading, isError } = useGetProfileQuery()
  const router = useRouter()
  const normalizedRoles = useMemo(
    () => (Array.isArray(roles) ? roles.map((role) => String(role).toLowerCase()) : undefined),
    [roles]
  )
  const userRole = String(data?.user?.role || '').toLowerCase()

  useEffect(() => {
    if (isLoading) return
    if (isError || !data?.user) {
      router.replace('/login')
      return
    }
    if (normalizedRoles && !normalizedRoles.includes(userRole)) {
      router.replace('/')
    }
  }, [data?.user, isError, isLoading, normalizedRoles, router, userRole])

  if (isLoading) return null
  if (isError || !data?.user) return null
  if (normalizedRoles && !normalizedRoles.includes(userRole)) return null

  return children
}


