/** Only this email may manually lock/unlock the app (Samir). */
export function billingOwnerEmail(): string {
  return (
    process.env.BILLING_OWNER_EMAIL ||
    process.env.BILLING_CONTACT_EMAIL ||
    "iyersamir@gmail.com"
  )
    .trim()
    .toLowerCase();
}

export function isBillingOwner(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === billingOwnerEmail();
}
