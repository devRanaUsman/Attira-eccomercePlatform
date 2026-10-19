import { useState } from "react";
import { Link } from "@/components/navigation";
import Icon from "../ui/Icon";
import { TrustGrid } from "../ui";
import { FOOTER_BENEFITS, FOOTER_LINKS } from "../../data/catalog";
import { Logo } from "./Header";

const SOCIAL = [["Instagram", "instagram", "https://instagram.com"], ["Facebook", "facebook", "https://facebook.com"], ["Pinterest", "pinterest", "https://pinterest.com"], ["TikTok", "tiktok", "https://tiktok.com"], ["YouTube", "youtube", "https://youtube.com"]];

function FooterCol({ title, links }) {
  const [open, setOpen] = useState(false);
  const id = `fcol-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="footer__col">
      <button type="button" className="footer__title" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>{title}<Icon name="chevronDown" size={16} /></button>
      <ul className="footer__list" id={id} data-open={open}>{links.map(([l, to]) => <li key={to + l}><Link to={to}>{l}</Link></li>)}</ul>
    </div>
  );
}

export default function Footer() {
  return (
    <>
      <div className="footer-benefits"><div className="container"><TrustGrid items={FOOTER_BENEFITS} /></div></div>
      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__brand">
              <Logo />
              <p>Timeless style, thoughtfully chosen. Made for every you.</p>
              <ul className="footer__social" aria-label="Follow Attira">{SOCIAL.map(([n, ic, href]) => <li key={n}><a href={href} target="_blank" rel="noreferrer" aria-label={`Attira on ${n}`}><Icon name={ic} size={18} /></a></li>)}</ul>
              <div style={{ marginTop: 24 }}>
                <div className="footer__title" style={{ marginBottom: 8 }}>We accept</div>
                <div className="footer__pay" aria-label="Accepted payment methods">
                  <span className="pay-badge">Cash on delivery</span>
                </div>
              </div>
            </div>
            {Object.entries(FOOTER_LINKS).map(([t, links]) => <FooterCol key={t} title={t} links={links} />)}
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} Attira. All rights reserved.</span>
            <span><Link to="/seller/login">Seller portal</Link> · <Link to="/admin/login">Admin</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link> · <Link to="/sustainability">Sustainability</Link></span>
          </div>
        </div>
      </footer>
    </>
  );
}
