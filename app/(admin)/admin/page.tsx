"use client"

import PageTransition from "@/components/PageTransition"
import ProtectedRoute from "@/components/ProtectedRoute"

import Link from "next/link"
import { Button } from '@/components/ui/button'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import AdminProducts from './AdminProducts'
import AdminUsers from './AdminUsers'
import AdminOrders from './AdminOrders'
import AdminAnalytics from './AdminAnalytics'
import AdminReviews from './AdminReviews'
import { LayoutDashboard, Package, ShoppingBag, Users, MessageSquare } from 'lucide-react'
import { useGetAllOrdersQuery } from '@/features/orders/orderApi'
import { useAppSelector } from '@/store/hooks'
import { useToast } from '@/hooks/use-toast'
import { apiUrl } from '@/lib/apiBase'

function PageContent() {
  const [tab, setTab] = useState('products')
  const { toast } = useToast()
  const token = useAppSelector((state) => state.auth.token)
  const [newUsersCount, setNewUsersCount] = useState(0)
  const [newOrdersCount, setNewOrdersCount] = useState(0)
  const lastSeenUsersKey = 'shopluxe_admin_last_seen_users'
  const lastSeenOrdersKey = 'shopluxe_admin_last_seen_orders'
  const { data } = useGetAllOrdersQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnReconnect: true
  })
  const orders = data?.orders || []
  const sortedOrders = React.useMemo(
    () => [...orders].sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()),
    [orders]
  )
  const returnRequestCount = orders.filter(o => o?.returnStatus === 'requested').length
  const [soundEnabled, setSoundEnabled] = useState(false)
  const getLastSeen = (key: string) => {
    const value = localStorage.getItem(key)
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const setLastSeen = (key: string, date: any) => {
    if (!date) return
    localStorage.setItem(key, new Date(date).toISOString())
  }

  const playNotificationSound = useCallback((frequency = 880) => {
    if (!soundEnabled) return
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      
      const playTone = (freq: number, startAt: number, duration: number, peak: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, startAt)

        // Envelope for clear and louder ping without clicks
        gain.gain.setValueAtTime(0, startAt)
        gain.gain.linearRampToValueAtTime(peak, startAt + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startAt)
        osc.stop(startAt + duration)
        osc.onended = () => {
          gain.disconnect()
          osc.disconnect()
        }
      }

      const now = ctx.currentTime
      // Two-tone chime for better audibility
      playTone(frequency, now, 0.18, 0.22)
      playTone(frequency * 0.75, now + 0.2, 0.16, 0.2)

      setTimeout(() => ctx.close().catch(() => {}), 500)
    } catch (err) {
      console.warn('Notification audio failed:', err)
    }
  }, [soundEnabled])

  useEffect(() => {
    const stored = localStorage.getItem('shopluxe_admin_sound')
    if (stored === '1') setSoundEnabled(true)
  }, [])

  const toggleSound = async () => {
    const newState = !soundEnabled
    setSoundEnabled(newState)
    localStorage.setItem('shopluxe_admin_sound', newState ? '1' : '0')
    
    // Warm up audio context on user gesture
    if (newState) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioContext()
        if (ctx.state === 'suspended') await ctx.resume()
        
        // Brief test beep
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        gain.gain.value = 0.08
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.08)
        osc.onended = () => ctx.close()
        
        toast({ title: 'Notifications Enabled', description: 'Sound alerts are now active for new orders/users.' })
      } catch (err) {
        console.error('Failed to enable audio:', err)
      }
    }
  }

  const fetchUsersForNotifications = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/admin/users?sortBy=created-1&sort=created-1'), {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to fetch users')
      const users = Array.isArray(data.users) ? data.users : []
      const lastSeen = getLastSeen(lastSeenUsersKey)
      if (!lastSeen) {
        const latest = users[0]?.createdAt || new Date()
        setLastSeen(lastSeenUsersKey, latest)
        setNewUsersCount(0)
        return
      }
      const newUsers = users.filter(u => {
        const createdAt = u?.createdAt ? new Date(u.createdAt) : null
        return createdAt && createdAt > lastSeen
      })
      const count = newUsers.length
      setNewUsersCount(count)
      if (count > 0) {
        toast({
          title: 'New user registered',
          description: `${count} new user${count > 1 ? 's' : ''} joined.`
        })
        playNotificationSound(740)
      }
    } catch (err) {
      // Silent fail
    }
  }, [playNotificationSound, toast, token])

  useEffect(() => {
    fetchUsersForNotifications()
    const timer = setInterval(fetchUsersForNotifications, 20000) // Increased interval slightly for reliability
    return () => clearInterval(timer)
  }, [fetchUsersForNotifications])

  useEffect(() => {
    const lastSeen = getLastSeen(lastSeenOrdersKey)
    if (!lastSeen) {
      const latestOrder = sortedOrders[0]?.createdAt || new Date()
      setLastSeen(lastSeenOrdersKey, latestOrder)
      setNewOrdersCount(0)
      return
    }
    const newItems = sortedOrders.filter(o => {
      const createdAt = o?.createdAt ? new Date(o.createdAt) : null
      return createdAt && createdAt > lastSeen
    })
    const count = newItems.length
    
    if (count > newOrdersCount) {
      const diff = count - newOrdersCount
      toast({
        title: 'New order received',
        description: `${diff} new order${diff > 1 ? 's' : ''} just arrived.`
      })
      playNotificationSound(880)
    }
    setNewOrdersCount(count)
  }, [sortedOrders, newOrdersCount, playNotificationSound, toast])

  const handleTabChange = (id: string) => {
    setTab(id)
  }

  return (
    <div className='p-6 space-y-6'>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium">Manage your boutique operations and monitor real-time growth.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">System Audio</span>
            <span className="text-xs font-bold text-gray-700">{soundEnabled ? 'Alerts Active' : 'Alerts Muted'}</span>
          </div>
          <Button 
            onClick={toggleSound}
            variant={soundEnabled ? "default" : "outline"}
            className={`rounded-xl h-10 px-4 font-bold transition-all ${soundEnabled ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 shadow-lg' : 'text-gray-400'}`}
          >
            {soundEnabled ? '🔔 Disable Sound' : '🔕 Enable Sound'}
          </Button>
        </div>
      </div>

      <div className='flex flex-wrap gap-2 mb-8 bg-gray-50 p-2 rounded-2xl w-fit'>
        {[
          { id: 'products', label: 'Products', icon: Package },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'reviews', label: 'Reviews', icon: MessageSquare },
          { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.id
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'text-gray-400 hover:text-black hover:bg-white'
              }`}
          >
            <t.icon size={14} />
            {t.label}
            {t.id === 'users' && newUsersCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100">
                {newUsersCount}
              </span>
            )}
            {t.id === 'orders' && newOrdersCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                {newOrdersCount}
              </span>
            )}
            {t.id === 'orders' && returnRequestCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100">
                {returnRequestCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div>
        {tab === 'products' && <AdminProducts />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'orders' && <AdminOrders />}
        {tab === 'reviews' && <AdminReviews />}
        {tab === 'analytics' && <AdminAnalytics />}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <PageTransition>
        <PageContent />
      </PageTransition>
    </ProtectedRoute>
  )
}
