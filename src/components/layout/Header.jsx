import { accountHome } from "../../utils/account";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "@/components/navigation";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../ui/Icon";
import { IconButton } from "../ui";
import { NAV, FREE_SHIPPING_THRESHOLD, STORE_NAME } from "../../data/catalog";
import { uiActions } from "../../store/uiSlice";
import { selectCartCount } from "../../store/cartSlice";
import { selectWishlistIds } from "../../store/wishlistSlice";
import MobileMenu from "./MobileMenu";

const trustMessages = () => [
  { icon: "truck", text: `Free Shipping on Orders Over $${FREE_SHIPPING_THRESHOLD}`, short: `Free Shipping on $${FREE_SHIPPING_THRESHOLD}+` },
  { icon: "refresh", text: "Easy 30-Day Returns", short: "Easy 30-Day Returns" },
  { icon: "lock", text: "Pay on Delivery", short: "Cash on Delivery" },
];

function UtilityBar() {
  const TRUST_MSGS=trustMessages();
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % TRUST_MSGS.length), 3500); return () => clearInterval(t); }, []);
  return (
    <div className="utility" role="region" aria-label="Store benefits">
      <div className="container">
        <ul className="utility__list">{TRUST_MSGS.map((m) => <li key={m.text} className="utility__item"><Icon name={m.icon} size={16} />{m.text}</li>)}</ul>
        <div className="utility__rotator" aria-live="polite"><span key={i} className="utility__item"><Icon name={TRUST_MSGS[i].icon} size={15} />{TRUST_MSGS[i].short}</span></div>
      </div>
    </div>
  );
}

export function Logo({ className = "" }) {
  return (<Link to="/" className={`logo ${className}`} aria-label={STORE_NAME+" home"}><span className="logo__mark" aria-hidden="true">{STORE_NAME.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>{STORE_NAME.toUpperCase()}</Link>);
}

function MegaMenu({ item, onClose }) {
  const { columns, feature } = item.mega;
  return (
    <div className="mega" role="region" aria-label={`${item.label} menu`}>
      <div className="container">
        <div className="mega__inner" style={{ "--cols": columns.length }}>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mega__col-title">{col.title}</div>
              <ul className="mega__list">{col.links.map(([label, to]) => <li key={to}><Link to={to} onClick={onClose}>{label}</Link></li>)}</ul>
            </div>
          ))}
          <Link to={feature.to} className="mega__feature" onClick={onClose}>
            <img src={feature.image} alt="" loading="lazy" width="600" height="750" />
            <span className="mega__feature-copy"><strong>{feature.title}</strong><span>{feature.text}</span></span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const wishCount = useSelector(selectWishlistIds).length;
  const isAuth = useSelector((s) => s.auth.isAuthenticated);
  const role = useSelector((s) => s.auth.user?.role);
  const location = useLocation();
  const [stuck, setStuck] = useState(false);
  const [openMega, setOpenMega] = useState(null);
  const timer = useRef();
  const navRef = useRef(null);

  useEffect(() => { const h = () => setStuck(window.scrollY > 40); h(); window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h); }, []);
  useEffect(() => { setOpenMega(null); }, [location.pathname]);
  useEffect(() => {
    if (!openMega) return;
    const onKey = (e) => e.key === "Escape" && setOpenMega(null);
    const onClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenMega(null); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [openMega]);

  const enter = (label) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpenMega(label), 120); };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpenMega(null), 180); };

  return (
    <>
      <UtilityBar />
      <header className={`header ${stuck ? "is-stuck" : ""}`}>
        <div className="container header__bar">
          <div className="header__left">
            <IconButton icon="menu" label="Open menu" className="only-mobile-flex" onClick={() => dispatch(uiActions.openMenu())} aria-haspopup="dialog" />
            <Logo />
          </div>
          <div className="header__center" ref={navRef}>
            <nav className="nav" aria-label="Main">
              {NAV.map((item) => (
                <div key={item.label} className="nav__item" onMouseEnter={() => item.mega && enter(item.label)} onMouseLeave={leave}>
                  <NavLink to={item.to} className={({ isActive }) => `nav__link ${item.accent ? "nav__link--accent" : ""} ${isActive ? "is-active" : ""}`}
                    aria-haspopup={item.mega ? "true" : undefined} aria-expanded={item.mega ? openMega === item.label : undefined}
                    onFocus={() => item.mega && setOpenMega(item.label)}
                    onKeyDown={(e) => { if (item.mega && (e.key === "ArrowDown" || e.key === " ")) { e.preventDefault(); setOpenMega(item.label); } }}>
                    {item.label}{item.mega && <Icon name="chevronDown" size={14} />}
                  </NavLink>
                  {item.mega && openMega === item.label && <MegaMenu item={item} onClose={() => setOpenMega(null)} />}
                </div>
              ))}
            </nav>
          </div>
          <div className="header__right">
            <IconButton icon="search" label="Search" onClick={() => dispatch(uiActions.openSearch())} aria-haspopup="dialog" />
            <IconButton icon="user" label={isAuth ? "My account" : "Sign in"} to={isAuth ? accountHome(role) : "/login"} className="only-desktop-flex" />
            <IconButton icon="heart" label="Wishlist" count={wishCount} to="/wishlist" />
            <IconButton icon="cart" label="Cart" count={cartCount} onClick={() => dispatch(uiActions.openCart())} aria-haspopup="dialog" />
          </div>
        </div>
      </header>
      <MobileMenu />
    </>
  );
}
