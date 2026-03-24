"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetProfileQuery } from '@/features/auth/authApi'

export default function ProtectedRoute({ children, roles }) {
  const { data, isLoading, isError } = useGetProfileQuery()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (isError || !data?.user) {
      router.replace('/login')
      return
    }
    if (roles && !roles.includes(data.user.role)) {
      router.replace('/')
    }
  }, [data?.user, isError, isLoading, roles, router])

  if (isLoading) return null
  if (isError || !data?.user) return null
  if (roles && !roles.includes(data.user.role)) return null

  return children
}


