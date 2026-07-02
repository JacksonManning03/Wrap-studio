import type { VehicleClass } from "@/lib/pricing/constants";

/**
 * Simple side-profile silhouettes (1000x400 viewBox) per vehicle class.
 * Used for: placeholder mockups, the cut-guide layer, and coverage preview.
 * body: closed path of the wrappable body. wheels: [cx, cy, r][].
 */
export interface Silhouette { body: string; wheels: [number, number, number][]; }

const sedan: Silhouette = {
  body: "M60,270 C70,230 120,210 200,205 L280,150 C300,135 340,125 420,125 L560,125 C620,125 660,140 690,170 L740,205 C840,212 920,230 935,265 L940,290 L60,290 Z",
  wheels: [[240, 290, 46], [760, 290, 46]],
};
const suv: Silhouette = {
  body: "M60,275 C65,230 110,205 190,200 L240,130 C255,110 300,100 400,100 L640,100 C700,100 740,115 765,150 L800,200 C880,208 930,228 938,268 L940,292 L60,292 Z",
  wheels: [[235, 292, 50], [755, 292, 50]],
};
const van: Silhouette = {
  body: "M70,285 C70,180 90,110 170,95 L700,90 C790,90 870,120 915,190 L935,260 L938,290 L70,290 Z",
  wheels: [[220, 290, 48], [770, 290, 48]],
};
const highRoofVan: Silhouette = {
  body: "M70,285 C70,150 85,70 175,60 L710,58 C800,60 875,95 918,175 L936,258 L938,290 L70,290 Z",
  wheels: [[220, 290, 48], [775, 290, 48]],
};
const pickup: Silhouette = {
  body: "M60,275 C65,235 105,215 180,210 L235,140 C250,120 295,110 380,110 L520,110 C560,110 585,120 600,145 L620,205 L900,205 C925,205 938,225 938,255 L940,290 L60,290 Z",
  wheels: [[230, 290, 48], [780, 290, 48]],
};
const boxTruck: Silhouette = {
  body: "M55,290 L55,80 L700,80 L700,150 L730,150 C760,150 790,165 815,205 L840,255 L940,255 L940,290 Z",
  wheels: [[200, 290, 44], [620, 290, 44], [845, 290, 44]],
};
const bus: Silhouette = {
  body: "M50,290 L50,90 C50,72 62,62 85,62 L915,62 C935,62 948,74 948,92 L948,290 Z",
  wheels: [[210, 290, 46], [790, 290, 46]],
};
const trailer: Silhouette = {
  body: "M40,260 L40,70 L960,70 L960,260 Z",
  wheels: [[770, 285, 40], [860, 285, 40]],
};
const moto: Silhouette = {
  body: "M300,250 C330,190 420,160 500,175 L620,150 C660,142 700,160 710,195 L680,250 Z",
  wheels: [[300, 275, 62], [720, 275, 62]],
};
const boat: Silhouette = {
  body: "M60,180 L940,150 C930,215 880,265 780,275 L200,275 C130,265 80,225 60,180 Z",
  wheels: [],
};

export const SILHOUETTES: Record<VehicleClass, Silhouette> = {
  "coupe-compact": sedan, sedan, "small-suv": suv, "full-suv": suv,
  minivan: van, pickup, "cargo-van": van, "high-roof-van": highRoofVan,
  "box-truck-16": boxTruck, "box-truck-24": boxTruck, bus,
  "semi-trailer": trailer, motorcycle: moto, boat, "food-truck": boxTruck,
  other: sedan,
};
