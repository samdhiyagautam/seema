export type Role = "super_admin" | "manager" | "staff" | "content_manager";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "advance_paid" | "paid" | "refunded";
export type LeadStatus = "new" | "contacted" | "follow_up" | "converted" | "lost";
export type SourceChannel =
  | "website"
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "youtube"
  | "referral"
  | "walk_in"
  | "phone"
  | "other";

export type Service = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  duration_minutes: number;
  price_inr: number;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
};

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: SourceChannel | null;
  notes: string | null;
  created_at: string;
  last_visit_at: string | null;
};

export type Booking = {
  id: string;
  code: string;
  customer_id: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  total_price: number;
  discount_amount: number;
  amount_paid: number;
  refund_amount: number;
  appointment_date: string;
  appointment_time: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  channel: SourceChannel;
  assigned_staff_id: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: { full_name: string; phone: string } | null;
};

export type Lead = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: SourceChannel;
  service_interest: string | null;
  message: string | null;
  status: LeadStatus;
  follow_up_on: string | null;
  lost_reason: string | null;
  converted_booking_id: string | null;
  admin_notes: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  customer_id: string | null;
  booking_id: string | null;
  author_name: string;
  author_phone: string | null;
  rating: number;
  comment: string;
  is_approved: boolean;
  is_verified: boolean;
  created_at: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  image_url: string;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

export type StaffMember = {
  id: string;
  full_name: string;
  role_title: string;
  bio: string | null;
  specialties: string[];
  phone: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
};

export type BlockedDate = {
  id: string;
  blocked_on: string;
  reason: string | null;
};

export type AnalyticsEventName =
  | "service_viewed"
  | "booking_started"
  | "booking_submitted"
  | "booking_confirmed"
  | "enquiry_submitted"
  | "whatsapp_cta_clicked"
  | "course_enquiry_submitted";
