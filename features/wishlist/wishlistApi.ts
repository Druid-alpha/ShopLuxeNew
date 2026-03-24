import { api } from "@/store/api";
import type { Product } from "@/types/models";

type WishlistResponse = { wishlist?: Product[] };

export const wishlistApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch wishlist
    getWishlist: builder.query<WishlistResponse, void>({
      query: () => ({
        url: "/wishlist",
        credentials: "include",
      }),
      providesTags: ["Wishlist"],
    }),

    // Toggle wishlist
    toggleWishlist: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({
        url: "/wishlist/toggle",
        method: "POST",
        body: { productId },
        credentials: "include",
      }),
      invalidatesTags: ["Wishlist"],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useToggleWishlistMutation,
} = wishlistApi;


