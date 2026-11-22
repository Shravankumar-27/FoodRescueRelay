import { describe,it,expect } from "vitest";
import {allocateFairly} from "../lib/allocation";
import {storyPoster,recognitionPosterSvg} from "../lib/recognitionPoster";
import type {DonationRecognition} from "../types/recognition";
const group=(people:number)=>({name:"Group",people,servings:0,dietary_notes:""});
describe("whole-serving allocation",()=>{
  it("distributes by largest remainders without exceeding the batch",()=>{
    expect(allocateFairly([group(3),group(2),group(1)],5).map(g=>g.servings)).toEqual([2,2,1]);
    for(let available=0;available<100;available++){
      const result=allocateFairly([group(13),group(7),group(11)],available);
      expect(result.reduce((s,g)=>s+g.servings,0)).toBe(Math.min(31,available));
      expect(result.every(g=>Number.isInteger(g.servings)&&g.servings<=g.people)).toBe(true);
    }
  });
  it("leaves surplus unassigned and handles empty groups",()=>{
    expect(allocateFairly([group(2)],10)[0].servings).toBe(2);
    expect(allocateFairly([],10)).toEqual([]);
  });
});
describe("link-free recognition",()=>{
  it("has decorative artwork but no printed URL or QR code",()=>{
    const svg=storyPoster({name:'Kitchen <one>',title:"Care creates change.",eyebrow:"CONTRIBUTION",amount:"1,320",unit:"COINS",secondary:"132 meals",secondaryNote:"Confirmed",third:"52.8 kg",thirdNote:"Estimated",quote:"Visit https://example.test/donate for details",issuer:"RescueRelay",footer:"2026",badge:"CARE",theme:"garden",disclaimer:"Demo"});
    expect(svg).toContain("Kitchen &lt;one&gt;");expect(svg).toContain("<path");expect(svg).not.toContain("example.test");expect(svg).not.toContain("<image");expect(svg).not.toContain("<a ");
  });
  it("credits the receiver without implying a donor endorsement",()=>{
    const record={donor_name:"Donor",receiver_name:"Receiver",message:"Donor appreciation",delivered_servings:10,people_served:null,food_rating:null,display_id:"RR-1",issued_at:"2026-11-22",public_token:"secret"} as DonationRecognition;
    const svg=recognitionPosterSvg(record,"garden","https://example.test","receiver");
    expect(svg).toContain("RECEIVER CONTRIBUTION RECORD");expect(svg).toContain("Food contributed by Donor");expect(svg).not.toContain("secret");expect(svg).not.toContain("example.test");
  });
});
