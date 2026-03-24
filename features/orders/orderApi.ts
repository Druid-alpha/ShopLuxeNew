import { api } from "@/store/api";

export const orderApi = api.injectEndpoints({
    endpoints: (builder) => ({
        createOrder: builder.mutation({
            query: (payload) => ({
                url: '/orders',
                method: 'POST',
                body: payload
            }),
            invalidatesTags: ['Order']
        }),
        getMyOrders: builder.query({
            query: () => '/orders/my',
            providesTags: ['Order']
        }),
        getAllOrders: builder.query({
            query: () => '/orders',
            providesTags: ['Order']
        }),
        getOrder: builder.query({
            query: (id) => `/orders/${id}`,
            providesTags: (result, error, id) => [{ type: 'Order', id }]
        }),
        generateOrderInvoice: builder.mutation({
            query: (id) => ({
                url: `/orders/${id}/invoice`,
                method: 'POST'
            }),
            invalidatesTags: (result, error, id) => [{ type: 'Order', id }]
        }),
        updateOrderStatus: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/orders/${id}/status`,
                method: 'PATCH',
                body: body
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, 'Order']
        }),
        deleteOrder: builder.mutation({
            query: (id) => ({
                url: `/orders/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Order']
        }),
        deleteOrdersBulk: builder.mutation({
            query: (orderIds) => ({
                url: '/admin/orders/delete-bulk',
                method: 'POST',
                body: { orderIds }
            }),
            invalidatesTags: ['Order']
        }),
        requestReturn: builder.mutation({
            query: ({ id, reason }) => ({
                url: `/orders/${id}/return`,
                method: 'POST',
                body: { reason }
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, 'Order']
        }),
        updateReturnStatus: builder.mutation({
            query: ({ id, status, note, refundAmount }) => ({
                url: `/orders/${id}/return`,
                method: 'PATCH',
                body: { status, note, refundAmount }
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, 'Order']
        }),
        addReturnMessage: builder.mutation({
            query: ({ id, message }) => ({
                url: `/orders/${id}/return/message`,
                method: 'POST',
                body: { message }
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, 'Order']
        }),
        addReturnMessageUser: builder.mutation({
            query: ({ id, message, attachments, formData }) => ({
                url: `/orders/${id}/return/message/user`,
                method: 'POST',
                body: formData ?? { message, attachments }
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'Order', id }, 'Order']
        }),
        uploadReturnAttachmentsUser: builder.mutation({
            query: ({ id, formData }) => ({
                url: `/orders/${id}/return/attachments`,
                method: 'POST',
                body: formData
            })
        }),
        refundOrder: builder.mutation({
            query: ({ orderId, amount, reason }) => ({
                url: `/payments/paystack/refund`,
                method: 'POST',
                body: { orderId, amount, reason }
            }),
            invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }, 'Order']
        })
    })
})

export const {
    useCreateOrderMutation,
    useGetOrderQuery,
    useGenerateOrderInvoiceMutation,
    useGetMyOrdersQuery,
    useGetAllOrdersQuery,
    useUpdateOrderStatusMutation,
    useDeleteOrderMutation,
    useDeleteOrdersBulkMutation,
    useRequestReturnMutation,
    useUpdateReturnStatusMutation,
    useAddReturnMessageMutation,
    useAddReturnMessageUserMutation,
    useUploadReturnAttachmentsUserMutation,
    useRefundOrderMutation
} = orderApi


