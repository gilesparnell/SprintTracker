"use client";

import dynamic from "next/dynamic";

const QuickSubmit = dynamic(
  () => import("./quick-submit").then((mod) => mod.QuickSubmit),
  { ssr: false }
);

const LoveNotes = dynamic(
  () => import("./love-notes").then((mod) => mod.LoveNotes),
  { ssr: false }
);

type Product = {
  id: string;
  name: string;
  color: string;
};

export function LazyQuickSubmit({ products }: { products: Product[] }) {
  return <QuickSubmit products={products} />;
}

export function LazyLoveNotes() {
  return <LoveNotes />;
}
