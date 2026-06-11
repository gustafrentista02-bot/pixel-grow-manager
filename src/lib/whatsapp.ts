/** Build a wa.me link from a Brazilian phone number (digits only, with country code). */
export function buildWhatsappLink(phone: string, text?: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  // Add Brazil country code if not present
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${encodeURIComponent(withCountry)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** tel: link for phone calls. */
export function buildTelLink(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return `tel:+${digits.startsWith("55") ? digits : `55${digits}`}`;
}
