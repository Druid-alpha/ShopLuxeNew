"use client";

import * as React from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from "@/features/products/productApi";

type ProductFormProps = {
  product: any | null;
  onClose?: () => void;
  onSuccess?: () => void;
  closeOnSuccess?: boolean;
};

export default function ProductForm({
  product,
  onClose,
  onSuccess,
  closeOnSuccess = false,
}: ProductFormProps) {
  const { toast } = useToast();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  const [options, setOptions] = React.useState({
    categories: [] as Array<{ _id: string; name: string }>,
    brands: [] as Array<{ _id: string; name: string }>,
    colors: [] as Array<{ _id: string; name?: string; hex?: string }>,
  });

  const [title, setTitle] = React.useState(product?.title || "");
  const [description, setDescription] = React.useState(product?.description || "");
  const [price, setPrice] = React.useState(product?.price ? String(product.price) : "");
  const [stock, setStock] = React.useState(product?.stock ? String(product.stock) : "");
  const [discount, setDiscount] = React.useState(product?.discount ? String(product.discount) : "");
  const [category, setCategory] = React.useState(product?.category?._id || product?.category || "");
  const [brand, setBrand] = React.useState(product?.brand?._id || product?.brand || "");
  const [color, setColor] = React.useState(product?.color?._id || product?.color || "");
  const [featured, setFeatured] = React.useState(!!product?.featured);
  const [images, setImages] = React.useState<FileList | null>(null);

  React.useEffect(() => {
    axios
      .get("/products/filters", { params: { includeAllBrands: true } })
      .then((res) => {
        setOptions({
          categories: res.data.categories || [],
          brands: res.data.brands || [],
          colors: res.data.colors || [],
        });
      })
      .catch(() => {
        // Silent fail; form still usable.
      });
  }, []);

  const isBusy = isCreating || isUpdating;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: "Missing fields",
        description: "Title, description, and category are required.",
        variant: "destructive",
      });
      return;
    }

    const payload: Record<string, any> = {
      title: title.trim(),
      description: description.trim(),
      price: price === "" ? undefined : Number(price),
      stock: stock === "" ? undefined : Number(stock),
      discount: discount === "" ? undefined : Number(discount),
      category,
      brand: brand || undefined,
      color: color || undefined,
      featured,
    };

    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    if (images?.length) {
      Array.from(images).forEach((file) => formData.append("images", file));
    }

    try {
      if (product?._id) {
        await updateProduct({ id: product._id, formData }).unwrap();
        toast({ title: "Product updated" });
      } else {
        await createProduct(formData).unwrap();
        toast({ title: "Product created" });
      }
      onSuccess?.();
      if (closeOnSuccess) onClose?.();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.data?.message || err?.message || "Could not save product",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">
              Title
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">
              Description
            </label>
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">
                Price
              </label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">
                Stock
              </label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">
                Discount %
              </label>
              <Input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">
              Category
            </label>
            <select
              className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              {options.categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">
              Brand
            </label>
            <select
              className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="">No brand</option>
              {options.brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">
              Color
            </label>
            <select
              className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="">No color</option>
              {options.colors.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name || c.hex || c._id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            <label htmlFor="featured" className="text-sm font-medium">
              Featured product
            </label>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-500">
              Images
            </label>
            <Input type="file" multiple onChange={(e) => setImages(e.target.files)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-black hover:bg-gray-800" disabled={isBusy}>
          {isBusy ? "Saving..." : product?._id ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
