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

  if (isLoading) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
          <div className="mt-3 h-2 w-48 rounded bg-slate-100 animate-pulse" />
        </div>
      </section>
    )
  }
  if (isError || !data?.user) return null
  if (normalizedRoles && !normalizedRoles.includes(userRole)) return null

  return children
}


