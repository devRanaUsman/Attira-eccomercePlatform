import { useState } from "react";
import { Link } from "@/components/navigation";
import Icon from "../ui/Icon";
import { Button } from "../ui";
import { subscribe } from "../../services/newsletterService";
import { rules } from "../../utils/validation";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState("idle");
  const submit = async (e) => {
    e.preventDefault();
    const err = rules.required("Email")(email) || rules.email()(email);
    if (err) { setError(err); return; }
    setError(""); setState("loading");
    try { await subscribe(email.trim().toLowerCase()); setState("done"); } catch { setState("idle"); setError("We couldn't subscribe you right now. Please try again."); }
  };
  return (
    <section className="newsletter" aria-labelledby="nl-title">
      <div className="container newsletter__inner">
        <div>
          <div className="newsletter__icon"><Icon name="mail" size={24} /></div>
          <h2 className="h2" id="nl-title">Join the ATTIRA Club</h2>
          <p>Be the first to know about new arrivals, exclusive offers and style inspiration.</p>
        </div>
        {state === "done" ? (
          <div className="newsletter__success" role="status"><Icon name="check" size={22} strokeWidth={2.5} /><div><b>Welcome to Attira.</b><div className="small muted">Your subscription for {email} has been saved.</div></div></div>
        ) : (
          <form className="newsletter__form" onSubmit={submit} noValidate>
            <div className="newsletter__row">
              <div style={{ flex: 1 }}>
                <label htmlFor="nl-email" className="sr-only">Email address</label>
                <input id="nl-email" type="email" className="input" placeholder="Enter your email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }} aria-invalid={error ? "true" : undefined} aria-describedby={error ? "nl-error" : "nl-note"} autoComplete="email" inputMode="email" />
              </div>
              <Button type="submit" loading={state === "loading"}>Join Now</Button>
            </div>
            {error && <span className="field__error" id="nl-error" role="alert"><Icon name="alert" size={13} />{error}</span>}
            <p className="newsletter__note" id="nl-note">By joining you agree to our <Link to="/privacy">privacy policy</Link>. Unsubscribe any time.</p>
          </form>
        )}
      </div>
    </section>
  );
}
