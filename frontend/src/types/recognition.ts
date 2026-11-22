export interface DonationRecognition {
  issuer_role?: "ADMIN" | "RECEIVER";
  rescue_id: string;
  display_id: string;
  public_token: string;
  donor_name: string;
  receiver_name: string;
  delivered_servings: number;
  delivered_at: string;
  issued_at: string;
  people_served: number | null;
  food_rating: number | null;
  message: string;
  status: "ISSUED" | "WITHDRAWN";
  demo: boolean;
  disclaimer: string;
}
