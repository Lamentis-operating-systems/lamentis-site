import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/components/site/product-page";
import { contentByLocale } from "@/domain/site/content";
import {
  isProductId,
  isSupportedLocale,
  productOrder,
  products,
} from "@/domain/site/routes";
import { metadataForRoute } from "@/domain/site/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return productOrder.map((product) => ({ product }));
}

type ProductPageProps = {
  params: Promise<{ locale: string; product: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { locale, product } = await params;
  if (!isSupportedLocale(locale) || !isProductId(product)) notFound();
  return metadataForRoute(locale, products[product].routeId);
}

export default async function LocalizedProductPage({
  params,
}: ProductPageProps) {
  const { locale, product } = await params;
  if (!isSupportedLocale(locale) || !isProductId(product)) notFound();

  const copy = contentByLocale[locale].products[product];
  return <ProductPage productId={product} title={copy.displayTitle} tagline={copy.tagline} />;
}
