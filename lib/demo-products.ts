export type DemoProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  createdAt: string;
};

type DemoProductInput = Omit<DemoProduct, "id" | "createdAt">;

const seed: DemoProduct[] = [
  {
    id: "demo-1",
    title: "Studio Tote",
    description: "Structured leather tote with brushed hardware.",
    price: 245000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Noir Sneaker",
    description: "Minimal low-top sneaker with contrast sole.",
    price: 165000,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    title: "Aurora Watch",
    description: "Stainless steel watch with sapphire glass.",
    price: 320000,
    createdAt: new Date().toISOString(),
  },
];

let products = [...seed];

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const listDemoProducts = () => products;

export const getDemoProduct = (id: string) =>
  products.find((product) => product.id === id) || null;

export const createDemoProduct = (input: DemoProductInput) => {
  const created: DemoProduct = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  products = [created, ...products];
  return created;
};

export const updateDemoProduct = (id: string, patch: Partial<DemoProductInput>) => {
  const product = getDemoProduct(id);
  if (!product) return null;
  const updated = { ...product, ...patch };
  products = products.map((item) => (item.id === id ? updated : item));
  return updated;
};

export const deleteDemoProduct = (id: string) => {
  const product = getDemoProduct(id);
  if (!product) return null;
  products = products.filter((item) => item.id !== id);
  return product;
};
