import {describe,it,expect} from "vitest";
import {recognitionPosterSvg,verificationUrl} from "../lib/recognitionPoster";
import type {DonationRecognition} from "../types/recognition";

const record:DonationRecognition={rescue_id:"rescue",display_id:"RR-TEST",public_token:"token",donor_name:'<script>alert("x")</script>',receiver_name:"Kitchen & Community",delivered_servings:132,delivered_at:"2026-11-22T00:00:00Z",issued_at:"2026-11-22T00:00:00Z",people_served:null,food_rating:null,message:"",status:"ISSUED",demo:true,disclaimer:"Demo"};
describe("appreciation artwork",()=>{
  it("escapes partner text and creates self-contained artwork",()=>{
    const svg=recognitionPosterSvg(record,"garden","https://example.test");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("Kitchen &amp; Community");
    expect(svg).not.toContain("<image");
    expect(svg).toContain("RESCUERELAY · CONTRIBUTION RECOGNITION");
  });
  it("does not equate servings to people or invent a rating",()=>{
    const svg=recognitionPosterSvg(record,"midnight","https://example.test");
    expect(svg).toContain("Not counted");
    expect(svg).toContain("Not rated");
    expect(svg).toContain("132");
    expect(verificationUrl(record,"https://example.test")).toBe("https://example.test/recognition/verify/token");
  });
});
