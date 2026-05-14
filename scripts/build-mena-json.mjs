import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Paste from spec — header + rows */
const raw = `section,id,business,category,address,phone,status,notes
restaurants,1,Yoshigo Hibachi,Hibachi / Japanese,"1250 Crestwood Circle, Mena, AR 71953","479-588-1435","Listed / needs call","Listed by Visit Mena; verify current hours before publishing"
restaurants,2,Wendy's,Fast food,"901 Highway 71 North, Mena, AR 71953","479-394-1572","Verified active","Official Wendy's locator"
restaurants,3,The Walking Dog,Hot dogs / casual,"","","Listed / needs call","Listed by Visit Mena; address and phone not verified"
restaurants,4,The Gingered Baker,Bakery,"1201 Reine Street South, Mena, AR 71953","479-799-5338","Listed / needs call","Listed by Visit Mena and public business listings"
restaurants,5,The Corner,Deli / convenience-style food,"","","Listed / needs call","Listed by Visit Mena; address and phone not verified"
restaurants,6,The Ouachita's,Dining / coffee / taproom,"821 Mena St., Mena, AR 71953","479-234-7305","Verified active","Official site"
restaurants,7,The Ouachita's Brewery,Brewery / drinks / food-adjacent,"1189 Highway 71 S., Mena, AR 71953","479-216-7297","Verified active","Official site"
restaurants,8,Suzy Q's Restaurant and Ice Cream Parlor,Comfort food / ice cream,"","","Listed / needs call","Listed by Visit Mena"
restaurants,9,Subway Sandwiches and Salads,Sandwiches,"1325 U.S. Hwy 71 S., Mena, AR 71953","479-394-2510","Verified active","Official Subway locator"
restaurants,10,Squeezy's Fresh Lemonade,Lemonade / drinks,"","","Food-related / seasonal","Likely stand or seasonal/mobile vendor"
restaurants,11,Skyline Cafe,American cafe / diner,"618 Mena St., Mena, AR 71953","479-394-5152","Verified active","Listed by Visit Mena and public listings"
restaurants,12,Sassysquatch,Casual food,"","","Listed / needs call","Listed by Visit Mena"
restaurants,13,Rieki Hibachi Sushi Asian Food,Hibachi / sushi / Asian,"410 Sherwood Ave., Mena, AR 71953","","Listed / needs call","May overlap with Mena Hibachi & Sushi; verify before publishing"
restaurants,14,Sherwood Bistro,Bistro / cafe,"","","Listed / needs call","Listed by Visit Mena"
restaurants,15,Papa's Mexican Cafe,Mexican,"1317 US-71, Mena, AR 71953","479-394-6521","Verified active","Official site"
restaurants,16,Sassafras Bakehouse,Bakery / cafe,"207 Mena Street, Mena, AR 71953","","Verified active","Official site"
restaurants,17,Little Italy II - Mena,Italian / pizza,"1411 US 71 N, Mena, AR 71953","","Verified active","Official site and public listings"
restaurants,18,Mena Hibachi & Sushi,Hibachi / sushi,"410 Sherwood Ave. Ste. 3, Mena, AR 71953","870-490-0351","Verified active","Official ordering site"
restaurants,19,My Sweet Bite,Food truck / Mexican street food / desserts,"","","Food-related / mobile","Listed by Visit Mena as a food truck"
restaurants,20,Mena Coffee Company,Coffee / drive-thru,"","","Listed / needs call","Public brand listing found; address and phone not verified"
restaurants,21,New China Restaurant,Chinese,"601 Hwy 71 N, Mena, AR 71953","479-394-5534","Listed / needs call","Listed by Visit Mena and public listings"
restaurants,22,Mamita's Tortilleria,Mexican / tortillas,"","","Listed / needs call","Listed by Visit Mena"
restaurants,23,Mackey's Catfish,Catfish / Southern,"1250 Crestwood Cir., Mena, AR 71953","","Verified active","Official location found; phone not verified in accessible text"
restaurants,24,IDC BBQ,BBQ,"","","Listed / needs call","Listed by Visit Mena"
restaurants,25,Kess Korner,Local food stop,"","","Listed / needs call","Listed by Visit Mena"
restaurants,26,Jerry's Fish Camp,Fish / casual,"","","Listed / needs call","Listed by Visit Mena"
restaurants,27,Honey & Pearl's,Coffee / cafe / drinks,"","","Listed / needs call","Listed by Visit Mena and online ordering source; contact not verified"
restaurants,28,James' Super Save Foods,Grocery / prepared food,"520 Mena St., Mena, AR 71953","","Food-related / not full restaurant","Grocery store with prepared food; also listed under stores"
restaurants,29,Fully Baked Cafe,Cafe / baked goods,"","","Listed / needs call","Listed by Visit Mena"
restaurants,30,La Villa Mexican Restaurant,Mexican,"","","Listed / needs call","Listed by Visit Mena and public restaurant listings"
restaurants,31,Cocina Flores,Mexican,"","","Listed / needs call","Listed by Visit Mena"
restaurants,32,Cruizzers Drive-In / Myers Cruizzers Drive-In,Drive-in / burgers,"409 Hwy 71 N, Mena, AR","","Listed / needs call","Public listing gives address; phone not verified"
restaurants,33,Chopping Block Steakhouse & Seafood,Steakhouse / seafood,"","","Verified active","Official source found earlier; address and phone should be verified before publishing"
restaurants,34,Donut Palace,Donuts / breakfast,"1321 Highway 71 S, Mena, AR","","Listed / needs call","Public listing gives address"
restaurants,35,Chicollo's Food Emporium,Local food stop,"","","Listed / needs call","Listed by Visit Mena"
restaurants,36,Chiquita's Mexican Restaurant,Mexican,"703 Highway 71 N, Mena, AR","","Listed / needs call","Address may overlap with Pizza Hut listing; verify before publishing"
restaurants,37,Flavor Eatery,Local restaurant,"","","Listed / needs call","Listed by Visit Mena"
restaurants,38,Bearded Guy Barbeque & Eats,BBQ,"","","Listed / needs call","Listed by Visit Mena"
restaurants,39,American Artisans,Cafe / sandwiches / gallery,"","","Verified active","TripAdvisor and public listings show it among top Mena restaurants; contact not verified"
restaurants,40,Big Poppa's Smoke Shack,BBQ,"","","Listed / needs call","Listed by Visit Mena"
restaurants,41,Branding Iron Steakhouse & BBQ,Steakhouse / BBQ,"623 Sherwood Ave., Mena, AR","","Likely closed","2023 liquidation auction found; do not use as active without calling"
restaurants,42,Big D's Station,Station / convenience food,"2414 Hwy 71 S, Mena, AR","","Food-related / not full restaurant","Public listing shows address; convenience or station-style food"
restaurants,43,Baskin Robbins,Ice cream / dessert,"","","Food-related / not full restaurant","Listed by Visit Mena"
restaurants,44,Sonic Drive-In,Fast food / drinks,"","","Listed / needs call","Listed by Visit Mena"
restaurants,45,Simple Simon's Pizza,Pizza,"","","Listed / needs call","Listed by Visit Mena; location may be nearby rather than Mena proper"
restaurants,46,Pizza Hut,Pizza / fast food,"703 Highway 71 N, Mena, AR 71953","479-394-5952","Verified active","Official Pizza Hut locator"
restaurants,47,McDonald's,Fast food,"709 Hwy 71, Mena, AR 71953","479-394-1131","Verified active","Official McDonald's locator"
restaurants,48,Kentucky Fried Chicken / Taco Bell,Fast food,"","","Listed / needs call","Listed by Visit Mena; address and phone not verified"
stores,1,Walmart Supercenter,Big-box retail / grocery / pharmacy,"600 Highway 71 N, Mena, AR 71953","479-394-0025","Verified official","Official Walmart listing"
stores,2,Harps Food Store,Grocery,"707 7th Street, Mena, AR 71953","479-394-7257","Verified Chamber","Mena/Polk County Chamber listing"
stores,3,James' Super Save Foods,Grocery,"520 Mena St., Mena, AR 71953","","Verified Visit Mena","Also listed under restaurants as food-related prepared food"
stores,4,Walgreens,Pharmacy / retail,"803 Highway 71 N, Mena, AR 71953","479-394-5144","Verified official","Official Walgreens locator"
stores,5,Dollar General,Discount retail,"1208 Hwy 71 S, Mena, AR 71953-8007","479-385-2772","Verified official","Official Dollar General listing"
stores,6,Dollar Tree,Discount retail,"1100 Highway 71 N #B, Mena, AR 71953-8414","479-385-2835","Verified official","Official Dollar Tree locator"
stores,7,Family Dollar,Discount retail,"601 Highway 71 North, Mena, AR 71953","479-777-6248","Public listing / verify","Verify before publishing"
stores,8,bealls,Clothing / home goods,"601 Highway 71 North, Mena, AR 71953","479-385-8889","Verified official","Official bealls listing"
stores,9,Shoe Sensation,Shoes / footwear,"601 Hwy 71 N, Mena, AR 71953","479-282-1995","Verified / public listing","Chamber and public listing"
stores,10,Gabriel Clothing Co. Mena,Clothing boutique,"","","Listed / needs call","Listed by Visit Mena shopping directory"
stores,11,Rock Creek Apparel,Apparel,"","","Listed / needs call","Listed by Chamber directory"
stores,12,The Front Porch,Gifts / boutique,"","","Listed / needs call","Listed by Visit Mena shopping directory"
stores,13,The Corner Shoppe / Pony Express Printing,Gifts / printing / engraving,"822 Mena St., Mena, AR 71953","479-394-7377","Verified Chamber","Chamber listing"
stores,14,Foot of the Hill Gift Shop,Gift shop,"","","Listed / needs call","Listed by Visit Mena; address should be verified"
stores,15,Books & Stuf,Bookstore / gifts,"","","Listed / needs call","Listed by Visit Mena; address should be verified"
stores,16,Wild Hare Art Glass Studio,Art glass / gifts,"","","Listed / needs call","Listed by Visit Mena"
stores,17,Mena Art Gallery,Art gallery / art sales,"","","Listed / needs call","Listed by Visit Mena and Chamber"
stores,18,Whispering Willows Enchanted Forest Art Gallery,Art gallery,"","","Listed / needs call","Listed by Chamber directory"
stores,19,The Old Bank Antiques,Antiques,"","","Listed / needs call","Listed by Visit Mena; address should be verified"
stores,20,Jo's Antiques,Antiques,"","","Listed / needs call","Listed by Visit Mena"
stores,21,Mena Flea Market,Flea market,"520 Mena St., Mena, AR 71953","","Verified Visit Mena","Indoor flea market"
stores,22,Mena Antique Mall,Antiques,"","","Listed / needs call","Listed by public shopping results"
stores,23,The Mercantile,Gift / specialty / mercantile,"","","Listed / needs call","Listed by public shopping results"
stores,24,The Market / The Market Alehouse & Mercantile,Mercantile / gifts / home decor,"","","Listed / needs call","Listed by Visit Mena itinerary"
stores,25,Rich Mountain Music & Jewelry,Music / jewelry,"","","Listed / needs call","Listed by public shopping results"
stores,26,Rich Mountain Music,Music store,"","","Listed / needs call","Listed by Chamber directory"
stores,27,Closet 821,Clothing / boutique,"","","Listed / needs call","Listed by public shopping results"
stores,28,The Fair Lady,Gift / specialty shop,"","","Listed / needs call","Listed by public shopping results"
stores,29,Washburn's Home Furnishings,Furniture / home furnishings,"1020 Mena St., Mena, AR 71953","","Listed / needs call","Listed by Chamber and Visit Mena"
stores,30,Coast to Coast Home & Hardware,Hardware / home / kitchen,"","","Listed / needs call","Listed by Visit Mena"
stores,31,Handy Hardware,Hardware,"","","Listed / needs call","Listed by Chamber directory"
stores,32,Tim's Outdoor,Outdoor / sporting / equipment,"","","Listed / needs call","Listed by Chamber directory"
stores,33,The Outback Barn,Retail / outdoor / general,"","","Listed / needs call","Listed by Chamber directory"
stores,34,Spokes & Sprockets LLC,Bicycle shop,"","","Listed / needs call","Listed by Visit Mena and Chamber"
stores,35,Wolf Pen Gap ATV Rentals,ATV rentals,"","","Listed / needs call","Listed by Chamber directory"
stores,36,Little Wolf Cabins & ATV Rentals,ATV rental,"","","Listed / needs call","Listed by Chamber directory"
stores,37,Thibodeaux's Country Store,Country store / grocery / fuel / souvenirs,"near Wolf Pen Gap South Trailhead","","Listed / needs call","Public/social listing"
stores,38,The Shop at the Foot of the Hill,Shop / gifts,"","","Listed / needs call","Listed by Chamber directory"
stores,39,The Mena Hotspot,Retail storefront / verify category,"1607 US-71, Mena, AR 71953","479-385-9606","Verified Chamber","Verify exact retail category before publishing"
stores,40,Russell Cellular / Verizon Authorized Retailer,Cell phones / wireless,"408 Hwy 71 N, Mena, AR 71953","479-437-3653","Verified official / Chamber","Official and Chamber listing"
stores,41,Goss Electronics,Electronics,"","","Listed / needs call","Listed by Chamber directory"
stores,42,The Office Store,Office supplies,"","","Listed / needs call","Listed by Chamber directory"
stores,43,Arklahoma Print and Digital Solutions,Printing / digital,"","","Listed / needs call","Listed by Chamber directory"
stores,44,South Main Graphics,Graphics / printing / signage,"","","Listed / needs call","Listed by Chamber directory"
stores,45,AutoZone Auto Parts,Auto parts,"104 N Cherry St., Mena, AR 71953","479-394-1185","Verified official","Official AutoZone listing"
stores,46,O'Reilly Auto Parts,Auto parts,"201 Highway 71 N, Mena, AR 71953","479-394-1351","Verified official","Official O'Reilly listing"
stores,47,Mena Pawn and Gun,Pawn / sporting goods,"","","Listed / needs call","Listed by Chamber; verify before client-facing use"
stores,48,Miner's A & B Tire,Tire shop / automotive retail,"","","Listed / needs call","Listed by Chamber directory"
stores,49,Mena's Collision & Glass,Auto glass / collision / tint,"1601 US-71, Mena, AR 71953","","Verified Chamber","Chamber listing"
stores,50,Richies Discount Auto Glass,Auto glass,"","","Listed / needs call","Listed by Chamber directory"
stores,51,Wholesale Electric Supply Co. Inc.,Electrical supply,"507 Sherwood Ave., Mena, AR 71953","479-394-5110","Verified Chamber","Chamber listing"
stores,52,Durable Medical Equipment & Supply,Medical equipment / supplies,"","","Listed / needs call","Listed by Chamber directory"
stores,53,Ellison Pharmacy,Pharmacy / health retail,"","","Listed / needs call","Listed by Chamber directory"
stores,54,Janssen Avenue Florists,Florist,"","","Listed / needs call","Listed by Chamber directory"
stores,55,Belle Point Beverages,Beverage supplier,"","","Listed / needs call","Listed by Chamber directory"
stores,56,Aynes Ice,Ice supplier,"","","Listed / needs call","Listed by Chamber directory"
stores,57,Burford Distributing Co.,Beverage wholesaler,"","","Listed / needs call","Listed by Chamber directory"
stores,58,Country Express,Convenience / fuel,"","","Listed / needs call","Listed by Chamber directory"
stores,59,Chuck Stop,Convenience / fuel,"","","Listed / needs call","Listed by Chamber directory"
stores,60,Don's E-Z Pay,Rent-to-own / retail,"","","Listed / needs call","Listed by Chamber directory"
stores,61,Repops,Retail / resale-style listing,"","","Listed / needs call","Listed by Chamber directory"
stores,62,Mom and Me,Boutique / retail,"","","Listed / needs call","Listed by Chamber directory"
stores,63,Jake's Fireworks,Seasonal fireworks,"","","Listed / needs call","Listed by Chamber directory"
stores,64,Martin Marietta,Building materials supplier,"","","Listed / needs call","Listed by Chamber directory"
stores,65,Red River Ready Mix,Ready-mix / building materials,"","","Listed / needs call","Listed by Chamber directory"
stores,66,Turner Specialty Products,Specialty products / supply,"","","Listed / needs call","Listed by Chamber directory"
stores,67,AmeriChemm,Industrial chemical supplier,"2913 US-71, Mena, AR 71953","479-394-1692","Verified Chamber","Industrial supplier; not normal consumer retail"
stores,68,Smith Pallet Co.,Pallet supplier,"","","Listed / needs call","Listed by Chamber directory"
stores,69,Fenix Industries Inc.,Manufacturing / industrial supplier,"","","Listed / needs call","Listed by Chamber directory"`;

const lines = raw.trim().split("\n");

function splitRow(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (!inQ && c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const header = splitRow(lines[0]);
const rows = lines.slice(1).map((line) => {
  const cells = splitRow(line);
  const o = {};
  header.forEach((h, idx) => {
    o[h] = cells[idx] ?? "";
  });
  o.id = Number(o.id);
  return o;
});

const outPath = path.join(__dirname, "../src/lib/mena-local-guide.json");
fs.writeFileSync(outPath, JSON.stringify(rows, null, 0), "utf8");
console.log("Wrote", rows.length, "rows to", outPath);
