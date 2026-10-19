import { useEffect, useMemo, useState } from "react";
import { Link } from "@/components/navigation";
import Icon from "../components/ui/Icon";
import { Button, ProductImage, TrustGrid, SectionHead } from "../components/ui";
import ProductCard, { CategoryCard, CollectionCard, ProductCarousel } from "../components/product/ProductCard";
import Newsletter from "../components/home/Newsletter";
import { useSeo } from "../hooks/useSeo";
import { allCategories, newArrivals, bestSellers, ALL_PRODUCTS, productUrl } from "../services/catalogService";
import { COLLECTIONS, TRUST, SALE_CAMPAIGN, CATEGORIES } from "../data/catalog";
import { money } from "../utils/format";

const HERO_IMG = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=78";
const PROMO_IMG = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=75";
const EDITORIAL_IMG = "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1000&q=75";

function Botanical({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 160" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M50 158C48 110 40 70 62 20" /><path d="M56 60c-18-4-30 4-38 20 16 2 30-4 38-20Z" /><path d="M58 88c14-10 30-8 40 6-14 8-30 6-40-6Z" /><path d="M54 116c-16-6-30-2-38 12 14 4 28 0 38-12Z" /><path d="M62 26c10-12 26-12 34-2-12 8-26 8-34 2Z" />
    </svg>
  );
}

function Countdown({ ends }) {
  const [left, setLeft] = useState(() => new Date(ends).getTime() - Date.now());
  useEffect(() => { const t = setInterval(() => setLeft(new Date(ends).getTime() - Date.now()), 60000); return () => clearInterval(t); }, [ends]);
  if (left <= 0) return null;
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return <div className="promo__countdown" aria-label={`Sale ends in ${d} days ${h} hours ${m} minutes`}><span>Ends in</span><b>{pad(d)}d {pad(h)}h {pad(m)}m</b></div>;
}

export default function Home() {
  useSeo({ title: "Elevate Your Everyday Style", description: "Timeless pieces. Thoughtful details. Shop women's and men's fashion, bags, shoes, beauty and home at Attira.", path: "/", jsonLd: { "@context": "https://schema.org", "@type": "WebSite", name: "Attira", url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), potentialAction: { "@type": "SearchAction", target: `${(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } } });
  const cats = useMemo(() => allCategories(), []);
  const [tab, setTab] = useState("all");
  const arrivals = useMemo(() => newArrivals(6, tab === "all" ? undefined : tab), [tab]);
  const best = useMemo(() => bestSellers(12), []);
  const pick = useMemo(() => ALL_PRODUCTS.find((p) => p.slug === "classic-satchel-bag") || best[0], [best]);
  const saleActive = new Date(SALE_CAMPAIGN.ends).getTime() > Date.now();
  const tabs = [{ id: "all", label: "All" }, ...CATEGORIES.slice(0, 6).map((c) => ({ id: c.slug, label: c.name }))];

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container">
          <div className="hero__inner">
            <div className="hero__copy">
              <h1 className="hero__title" id="hero-title">Elevate Your Everyday Style</h1>
              <p className="hero__sub">Timeless pieces. Thoughtful details. Made for every you.</p>
              <div className="hero__actions">
                <Button to="/new-arrivals" size="lg">Shop New Arrivals</Button>
                <Button to="/collections" variant="secondary" size="lg">Explore Collections</Button>
              </div>
            </div>
            <div className="hero__visual">
              <Botanical className="hero__botanical hero__botanical--l" />
              <div className="hero__arch">
                <img className="hero__img" src={HERO_IMG} alt="Woman in a cream blazer carrying a leather tote, part of the new season collection" width="1100" height="1300" fetchPriority="high" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              </div>
              <Botanical className="hero__botanical hero__botanical--r" />
              {pick && (
                <Link to={productUrl(pick)} className="hero__pick" aria-label={`Top pick: ${pick.product_name}`}>
                  <span className="hero__pick-label">Top pick<Icon name="heart" size={14} /></span>
                  <span className="hero__pick-img"><ProductImage src={pick.thumbnail} alt="" sizes="220px" name={pick.product_name} /></span>
                  <span className="hero__pick-name">{pick.product_name}</span>
                  <span className="hero__pick-price">{money(pick.sale_price ?? pick.regular_price)}</span>
                  <span className="btn btn--primary btn--sm">View product</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TRUST ---------- */}
      <div className="trust-strip"><div className="container"><TrustGrid items={TRUST} /></div></div>

      {/* ---------- CATEGORIES ---------- */}
      <section className="section" aria-labelledby="cats-title">
        <div className="container">
          <SectionHead title="Shop by Category" to="/categories" linkLabel="View all categories" />
          <div className="cat-cards">{cats.map((c) => <CategoryCard key={c.slug} category={c} />)}</div>
        </div>
      </section>

      {/* ---------- COLLECTIONS ---------- */}
      <section className="section section--tight" aria-labelledby="coll-title">
        <div className="container">
          <SectionHead title="Featured Collections" sub="Explore curated pieces, handpicked for you." to="/collections" linkLabel="View all collections" />
          <div className="coll-grid">{COLLECTIONS.map((c) => <CollectionCard key={c.slug} collection={c} />)}</div>
        </div>
      </section>

      {/* ---------- PROMO ---------- */}
      <section className="section section--tight" aria-labelledby="promo-title">
        <div className="container">
          <div className="promo">
            <div className="promo__copy">
              <h2 className="promo__title" id="promo-title">{SALE_CAMPAIGN.name}</h2>
              <div className="promo__big">{SALE_CAMPAIGN.headline}</div>
              <p className="promo__sub">{SALE_CAMPAIGN.sub}</p>
              {saleActive && <Countdown ends={SALE_CAMPAIGN.ends} />}
              <div><Button to="/sale">Shop the Sale</Button></div>
            </div>
            <div className="promo__media"><img src={PROMO_IMG} alt="" loading="lazy" decoding="async" width="1100" height="740" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
          </div>
        </div>
      </section>

      {/* ---------- NEW ARRIVALS ---------- */}
      <section className="section" aria-labelledby="new-title">
        <div className="container">
          <div className="section-head"><div><h2 className="h2" id="new-title">New Arrivals</h2></div><Button variant="tertiary" to={`/new-arrivals${tab !== "all" ? `?category=${tab}` : ""}`} iconRight="arrowRight">View all</Button></div>
          <div className="tabs tabs--pills home-tabs" role="tablist" aria-label="Filter new arrivals by category">{tabs.map((t) => <button key={t.id} type="button" role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
          {arrivals.length ? <div className="product-grid product-grid--home">{arrivals.map((p, i) => <ProductCard key={p.product_id} product={p} eager={i < 2} />)}</div> : <p className="muted">No new arrivals in this category yet — check back soon.</p>}
        </div>
      </section>

      {/* ---------- BEST SELLERS ---------- */}
      <section className="section section--tight">
        <div className="container"><ProductCarousel id="best-title" title="Best Sellers" sub="Trending now with our community" to="/best-sellers" products={best} /></div>
      </section>

      {/* ---------- EDITORIAL ---------- */}
      <section className="section section--tight">
        <div className="container">
          <div className="editorial">
            <div className="editorial__img"><img src={EDITORIAL_IMG} alt="Neutral knitwear folded on linen" loading="lazy" decoding="async" width="1000" height="750" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
            <div className="editorial__copy">
              <h2 className="h2">Made to be worn often</h2>
              <p>We design for the pieces you reach for every week: considered fabrics, honest construction and shapes that stay relevant well beyond a season.</p>
              <div className="row"><Button to="/about" variant="secondary">Our story</Button><Button to="/sustainability" variant="tertiary" iconRight="arrowRight" style={{ color: "var(--cream)" }}>Sustainability</Button></div>
            </div>
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
