"use client"

import PageTransition from "@/components/PageTransition";
import ProtectedRoute from "@/components/ProtectedRoute";

import React from 'react'
import Link from "next/link"
import { useGetMyOrdersQuery, useAddReturnMessageUserMutation } from '@/features/orders/orderApi'
import { Button } from '@/components/ui/button'
import { estimateEtaRange } from '@/lib/eta'
import { CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppSelector } from '@/store/hooks'
import { apiUrl } from '@/lib/apiBase'

const STATUS_META = {
  pending: { label: 'Pending', tone: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
  paid: { label: 'Paid', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
  processing: { label: 'Processing', tone: 'bg-slate-50 text-slate-700 border-slate-200', icon: Package },
  shipped: { label: 'Shipped', tone: 'bg-blue-50 text-blue-700 border-blue-100', icon: Truck },
  delivered: { label: 'Delivered', tone: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle2 },
  failed: { label: 'Failed', tone: 'bg-rose-50 text-rose-700 border-rose-100', icon: XCircle },
  cancelled: { label: 'Cancelled', tone: 'bg-gray-50 text-gray-500 border-gray-200', icon: XCircle },
}

const TRACK_STEPS = ['Placed', 'Processing', 'Shipped', 'Delivered']
const progressIndex = (status: string) => {
  switch (status) {
    case 'pending':
    case 'paid':
      return 0
    case 'processing':
      return 1
    case 'shipped':
      return 2
    case 'delivered':
      return 3
    default:
      return null
  }
}

const formatMessageTime = (msg: any) => {
  const raw = msg?.createdAt || msg?.sentAt || msg?.timestamp || msg?.time || msg?.date
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function PageContent() {
  const { toast } = useToast()
  const token = useAppSelector(state => state.auth.token)
  const { data, isLoading, isError, refetch } = useGetMyOrdersQuery(undefined, {
    pollingInterval: 15000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const [sendReturnMessage, { isLoading: isSendingMessage }] = useAddReturnMessageUserMutation()
  const [draftMessages, setDraftMessages] = React.useState<Record<string, string>>({})
  const [draftFiles, setDraftFiles] = React.useState<Record<string, any[]>>({})
  const fileInputRefs = React.useRef<Record<string, any>>({})
  const ordersRaw = data?.orders || data || []
  const orders = Array.isArray(ordersRaw)
    ? [...ordersRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : []

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-100 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
          <div className="h-24 w-full bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white border border-rose-100 rounded-2xl p-8 shadow-sm">
          <p className="text-rose-600 font-semibold">Unable to load your orders.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-gray-900">Track Your Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Follow your delivery progress and view each receipt.</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
          <p className="text-gray-600 font-medium">You have no orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusKey = String(order.status || 'pending').toLowerCase()
            const meta = STATUS_META[statusKey as keyof typeof STATUS_META] || STATUS_META.pending
            const Icon = meta.icon
            const stepIndex = progressIndex(statusKey)
            const returnStatus = order?.returnStatus && order.returnStatus !== 'none'
              ? order.returnStatus
              : null
            const canMessage = ['requested', 'approved'].includes(order?.returnStatus)
            const draft = draftMessages[order._id] || ''
            const files = draftFiles[order._id] || []
            const inputFiles = Array.from(fileInputRefs.current[order._id]?.files || [])

            const handleMessageSend = async () => {
              const hasFiles = files.length > 0 || inputFiles.length > 0
              if (!draft.trim() && !hasFiles) {
                toast({ title: 'Message required', description: 'Type a message or attach a file.', variant: 'destructive' })
                return
              }
              try {
                const filesToSend = files.length > 0
                  ? files.map(f => f?.file).filter(Boolean)
                  : inputFiles
                if (filesToSend.length > 0) {
                  const formData = new FormData()
                  formData.append('message', draft || 'Attachment(s) provided')
                  filesToSend.forEach((file) => {
                    if (file) formData.append('files', file)
                  })
                  const res = await fetch(apiUrl(\`/orders/\${order._id}/return/message/user\`), {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                      ...(token ? { Authorization: \`Bearer \${token}\` } : {})
                    },
                    body: formData
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data?.message || 'Failed to send message')
                } else {
                  await sendReturnMessage({ id: order._id, message: draft }).unwrap()
                }
                toast({ title: 'Message sent', description: 'Support will get back to you shortly.' })
                setDraftMessages(prev => ({ ...prev, [order._id]: '' }))
                setDraftFiles(prev => ({ ...prev, [order._id]: [] }))
                if (fileInputRefs.current[order._id]) fileInputRefs.current[order._id].value = ''
                refetch()
              } catch (err: any) {
                toast({
                  title: 'Message failed',
                  description: err?.data?.message || 'Please try again.',
                  variant: 'destructive'
                })
              }
            }

            return (
              <div key={order._id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Order ID</p>
                    <p className="text-sm font-bold text-gray-900">{order._id}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {estimateEtaRange(order)?.label && (
                      <p className="text-xs font-semibold text-gray-500">{estimateEtaRange(order).label}</p>
                    )}
                  </div>
                  <span className={\`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border \${meta.tone}\`}>
                    <Icon size={14} />
                    {meta.label}
                  </span>
                </div>

                {/* Items List */}
                <div className="flex flex-wrap gap-4 pt-2">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 border border-gray-100 p-3 rounded-xl min-w-[200px] flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image ? (
                           <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                           <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-xs font-bold text-gray-900 line-clamp-1">{item.title}</span>
                        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border">Qty: {item.qty || 1}</span>
                          {(item.size || item.clothingSize) && (
                            <span className="bg-white px-2 py-0.5 rounded border">Size: {item.size || item.clothingSize}</span>
                          )}
                          {item.color && (
                            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border">
                              <span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: item.code || item.color }}></span>
                              <span>{item.color}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {stepIndex === null ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-[11px] font-semibold text-rose-700">
                    This order was {meta.label.toLowerCase()}. If you need help, reach support with this order ID.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {TRACK_STEPS.map((step, idx) => (
                        <span key={step} className={idx <= stepIndex ? 'text-gray-900' : ''}>
                          {step}
                        </span>
                      ))}
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all"
                        style={{ width: \`\${((stepIndex + 1) / TRACK_STEPS.length) * 100}%\` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-gray-900">NGN {(order.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  {returnStatus && (
                    <span className={\`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border \${
                      returnStatus === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : returnStatus === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : returnStatus === 'requested'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                    }\`}>
                      Return {returnStatus}
                    </span>
                  )}
                  {order.returnNote && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-[11px] font-semibold text-amber-800">
                      Note from support: {order.returnNote}
                    </div>
                  )}
                  {Array.isArray(order.returnMessages) && order.returnMessages.length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px] font-semibold text-slate-700 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Message History</span>
                      {order.returnMessages.map((msg: any, idx: number) => {
                        const timeLabel = formatMessageTime(msg)
                        return (
                          <div key={idx} className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {msg.by}{msg.status ? \` • \${msg.status}\` : ''}{timeLabel ? \` • \${timeLabel}\` : ''}
                            </span>
                            <span>{msg.message}</span>
                            {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {msg.attachments.map((url: string, fileIdx: number) => (
                                  <a
                                    key={\`\${url}-\${fileIdx}\`}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full"
                                  >
                                    View File {fileIdx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {canMessage && (
                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const selected = Array.from(e.target.files || []).slice(0, 5).map((file) => ({
                            file,
                            previewUrl: URL.createObjectURL(file)
                          }))
                          setDraftFiles(prev => ({ ...prev, [order._id]: selected }))
                        }}
                        ref={(el) => { fileInputRefs.current[order._id] = el }}
                        className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:text-xs file:font-semibold hover:file:bg-gray-200"
                      />
                      {files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {files.map((file: any, idx: number) => (
                            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                              <img src={file.previewUrl} alt={\`Attachment \${idx + 1}\`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setDraftFiles(prev => ({ ...prev, [order._id]: prev[order._id].filter((_: any, i: number) => i !== idx) }))}
                                className="absolute top-1 right-1 bg-white/90 text-gray-700 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <textarea
                        value={draft}
                        onChange={(e) => setDraftMessages(prev => ({ ...prev, [order._id]: e.target.value }))}
                        placeholder="Message support about this return..."
                        className="w-full border rounded-lg p-2 text-[11px] font-medium placeholder:text-gray-300 focus:outline-none focus:border-black transition-all min-h-[70px]"
                      />
                      <Button
                        onClick={handleMessageSend}
                        disabled={isSendingMessage}
                        className="h-9 rounded-lg bg-black text-white hover:bg-gray-800"
                      >
                        {isSendingMessage ? 'Sending...' : 'Send Message'}
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" asChild className="rounded-xl">
                      <Link href={\`/orders/\${order._id}\`}>Track Order</Link>
                    </Button>
                    <Button asChild className="rounded-xl">
                      <Link href={\`/orders/\${order._id}\`}>View Receipt</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <ProtectedRoute roles={["user", "admin"]}>
      <PageTransition>
        <PageContent />
      </PageTransition>
    </ProtectedRoute>
  );
}
