import logoFull from "../assets/logo-full.jpg";

export default function ScreenBrand() {
  return (
    <div className="login-screen-brand">
      <img src={logoFull} alt="CSG & Associates — Chartered Accountants" className="brand-logo-full" />
      <div className="brand-logo-caption">CSG's CRM</div>
    </div>
  );
}
