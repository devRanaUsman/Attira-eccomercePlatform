import { useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from '@/components/navigation';
import { cartActions, selectCartItems, selectCartTotals } from '@/store/cartSlice';
import orderService from '@/services/orderService';
import { SHIPPING_METHODS, COUNTRIES } from '@/data/catalog';
import { money } from '@/utils/format';
import { storage } from '@/utils/storage';
import { OrderSummary, PromoForm } from '../Cart';

export default function Checkout() {
  const items=useSelector(selectCartItems);
  const totals=useSelector(selectCartTotals);
  const user=useSelector(s=>s.auth.user);
  const dispatch=useDispatch();
  const navigate=useNavigate();
  const key=useRef(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [review,setReview]=useState(null);
  const [draft,setDraft]=useState(()=>user?.addresses?.find(a=>a.isDefault)||{});
  useEffect(()=>{
    try { key.current=sessionStorage.getItem('stylehub:checkout-key'); } catch {}
    key.current ||= crypto.randomUUID();
    try { sessionStorage.setItem('stylehub:checkout-key',key.current); } catch {}
  },[]);
  const signature=JSON.stringify({items:items.map(({productId,color,size,qty})=>({productId,color,size,qty})),method:totals.method.id,promo:totals.promoCode});
  const currentReview=review?.signature===signature?review:null;
  const shown=currentReview?.quote;
  async function reviewOrder(e) {
    e.preventDefault();
    if(busy)return;
    const shipping=Object.fromEntries(new FormData(e.currentTarget));
    setDraft(shipping);setBusy(true);setError('');
    const payload={idempotencyKey:key.current,items:items.map(({productId,color,size,qty})=>({productId,color,size,qty})),contact:{email:user.email,phone:shipping.phone},shipping,method:{id:totals.method.id},payment:{type:'cod'},totals:{promoCode:totals.promoCode}};
    try { const quote=await orderService.quote(payload);setReview({quote,payload,signature}); }
    catch(e) {setError(e.message);}
    finally {setBusy(false);}
  }
  async function place() {
    if(busy||!currentReview)return;
    setBusy(true);setError('');
    try {
      const saved=await orderService.place({...currentReview.payload,expectedTotal:shown.totals.total});
      try {sessionStorage.removeItem('stylehub:checkout-key');} catch {}
      storage.set('cart',{items:[],promo:null,shippingMethod:totals.method.id});
      dispatch(cartActions.clear());navigate('/order-confirmation/'+saved.number,{replace:true});
    } catch(e) {
      setError(e.message);if([400,409].includes(e.status))setReview(null);setBusy(false);
    }
  }
  return <div className="staff-auth"><Link to="/" className="staff-brand">ATTIRA</Link><div className="container page">
    <h1>Checkout</h1><p>Signed in as {user?.email}. Payment is due on delivery or collection.</p>
    {error&&<p role="alert" className="staff-error">{error}</p>}
    {!items.length&&!busy?<p>Your bag is empty. <Link to="/shop">Continue shopping</Link></p>:<div className="co-layout">
      <div className="staff-auth__card" style={{margin:'24px 0',maxWidth:'none'}}>
        {!currentReview?<form onSubmit={reviewOrder}>
          <h2>Shipping address</h2>
          {user?.addresses?.length>0&&<label>Saved address<select defaultValue="" onChange={e=>{const a=user.addresses.find(a=>a.id===e.target.value);if(a){setDraft(a);const form=e.currentTarget.form;for(const [k,v] of Object.entries(a)){const el=form.elements.namedItem(k);if(el&&typeof v==='string')el.value=v;}}}}><option value="">Enter a new address</option>{user.addresses.map(a=><option key={a.id} value={a.id}>{a.address1}, {a.city}</option>)}</select></label>}
          <div className="staff-form-grid">
            {[['firstName','First name'],['lastName','Last name'],['address1','Street address'],['address2','Apartment (optional)'],['city','City'],['state','State / region'],['postal','Postal code'],['phone','Phone']].map(([name,label])=><label key={name}>{label}<input name={name} required={name!=='address2'} maxLength={name==='postal'?30:name==='phone'?40:['firstName','lastName'].includes(name)?80:name.startsWith('address')?200:100} defaultValue={draft[name]||''}/></label>)}
            <label>Country<select name="country" defaultValue={draft.country||'United States'} required>{COUNTRIES.map(c=><option key={typeof c==='string'?c:c.value} value={typeof c==='string'?c:c.value}>{typeof c==='string'?c:c.label}</option>)}</select></label>
          </div>
          <label>Delivery<select value={totals.method.id} onChange={e=>dispatch(cartActions.setShipping(e.target.value))}>{SHIPPING_METHODS.map(m=><option key={m.id} value={m.id}>{m.name} · {m.eta}</option>)}</select></label>
          <p>Cash on delivery. No card details are required.</p><button disabled={busy}>{busy?'Checking prices…':'Review order'}</button>
        </form>:<>
          <h2>Review your order</h2><p>{shown.shipping.firstName} {shown.shipping.lastName}<br/>{shown.shipping.address1}{shown.shipping.address2&&`, ${shown.shipping.address2}`}<br/>{shown.shipping.city}, {shown.shipping.state} {shown.shipping.postal}<br/>{shown.shipping.country}</p>
          <p>{shown.method.name} · {shown.method.eta} · Cash on delivery</p><p>These prices were checked with the store. Any total change requires a new review.</p>
          <div className="staff-inline"><button disabled={busy} onClick={()=>setReview(null)}>Edit order</button><button disabled={busy} onClick={place}>{busy?'Placing order…':'Place order · '+money(shown.totals.total)}</button></div>
          <p>By placing your order you accept our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
        </>}
      </div>
      <aside className="card" style={{marginTop:24}}><h2>Order summary</h2>{(shown?.items||items).map(i=><p key={i.key} style={{margin:'16px 0'}}>{i.qty} × {i.name} — {money(i.qty*i.price)}</p>)}{!currentReview&&<PromoForm/>}<OrderSummary totals={shown?.totals||totals}/>{!currentReview&&<p className="small muted">The final price is checked when you review your order.</p>}<Link to="/cart">Edit bag</Link></aside>
    </div>}
  </div></div>;
}
