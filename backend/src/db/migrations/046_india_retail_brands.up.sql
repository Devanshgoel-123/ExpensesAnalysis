UPDATE categories
SET blurb = 'Amazon · Nykaa · Reliance · fashion'
WHERE is_global = TRUE AND slug = 'shopping';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Reliance Trends', ARRAY['Reliance Trends', 'Trends Footwear'], ARRAY['reliancetrends', 'trendsfootwear'], ARRAY['reliancetrends.com'], 'reliancetrends.com', '/providers/reliance-trends.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'reliance trends'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Reliance Digital', ARRAY['Reliance Digital'], ARRAY['reliancedigital'], ARRAY['reliancedigital.in'], 'reliancedigital.in', '/providers/reliance-digital.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'reliance digital'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Ajio', ARRAY['Ajio', 'Reliance Ajio'], ARRAY['ajio'], ARRAY['ajio.com'], 'ajio.com', '/providers/ajio.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'ajio'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'JioMart', ARRAY['JioMart', 'Jio Mart'], ARRAY['jiomart'], ARRAY['jiomart.com'], 'jiomart.com', '/providers/jiomart.svg', 'grocery', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'jiomart'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Reliance Fresh', ARRAY['Reliance Fresh'], ARRAY['reliancefresh'], ARRAY['reliancefresh.com'], 'reliancefresh.com', '/providers/reliance-fresh.svg', 'grocery', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'reliance fresh'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Smart Bazaar', ARRAY['Smart Bazaar', 'Reliance Smart'], ARRAY['smartbazaar', 'reliancesmart'], ARRAY['smartbazaar.relianceretail.com'], 'relianceretail.com', '/providers/smart-bazaar.svg', 'grocery', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'smart bazaar'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Nykaa', ARRAY['Nykaa', 'Nykaa Fashion', 'Nykaa Man', 'FSN E-Commerce'], ARRAY['nykaa', 'nykaafashion', 'fsnecommerce'], ARRAY['nykaa.com'], 'nykaa.com', '/providers/nykaa.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'nykaa'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Westside', ARRAY['Westside', 'Trent Limited'], ARRAY['westside', 'trentlimited'], ARRAY['westside.com'], 'westside.com', '/providers/westside.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'westside'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Pantaloons', ARRAY['Pantaloons', 'Aditya Birla Fashion', 'ABFRL'], ARRAY['pantaloons', 'abfrl'], ARRAY['pantaloons.com'], 'pantaloons.com', '/providers/pantaloons.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'pantaloons'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Levi''s', ARRAY['Levi''s', 'Levis', 'Levi Strauss'], ARRAY['levis', 'levistrauss'], ARRAY['levi.in', 'levi.com'], 'levi.in', '/providers/levis.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'levi''s'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Max Fashion', ARRAY['Max Fashion'], ARRAY['maxfashion'], ARRAY['maxfashion.com'], 'maxfashion.com', '/providers/max-fashion.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'max fashion'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Lifestyle', ARRAY['Lifestyle', 'Lifestyle Stores'], ARRAY['lifestylestores'], ARRAY['lifestylestores.com'], 'lifestylestores.com', '/providers/lifestyle.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'lifestyle'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Shoppers Stop', ARRAY['Shoppers Stop'], ARRAY['shoppersstop'], ARRAY['shoppersstop.com'], 'shoppersstop.com', '/providers/shoppers-stop.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'shoppers stop'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Zara', ARRAY['Zara'], ARRAY['zara'], ARRAY['zara.com'], 'zara.com', '/providers/zara.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'zara'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'H&M', ARRAY['H&M', 'H and M', 'Hennes'], ARRAY['handm', 'hmhennes'], ARRAY['hm.com'], 'hm.com', '/providers/hm.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'h&m'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Decathlon', ARRAY['Decathlon'], ARRAY['decathlon'], ARRAY['decathlon.in'], 'decathlon.in', '/providers/decathlon.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'decathlon'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Nike', ARRAY['Nike'], ARRAY['nike'], ARRAY['nike.com'], 'nike.com', '/providers/nike.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'nike'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Adidas', ARRAY['Adidas'], ARRAY['adidas'], ARRAY['adidas.co.in'], 'adidas.co.in', '/providers/adidas.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'adidas'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Puma', ARRAY['Puma'], ARRAY['puma'], ARRAY['in.puma.com'], 'in.puma.com', '/providers/puma.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'puma'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Bata', ARRAY['Bata'], ARRAY['bata'], ARRAY['bata.in'], 'bata.in', '/providers/bata.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'bata'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Skechers', ARRAY['Skechers'], ARRAY['skechers'], ARRAY['skechers.in'], 'skechers.in', '/providers/skechers.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'skechers'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Woodland', ARRAY['Woodland'], ARRAY['woodland'], ARRAY['woodlandworldwide.com'], 'woodlandworldwide.com', '/providers/woodland.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'woodland'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Metro Shoes', ARRAY['Metro Shoes', 'Mochi Shoes'], ARRAY['metroshoes', 'mochishoes'], ARRAY['metroshoes.net'], 'metroshoes.net', '/providers/metro-shoes.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'metro shoes'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Allen Solly', ARRAY['Allen Solly'], ARRAY['allensolly'], ARRAY['allensolly.com'], 'allensolly.com', '/providers/allen-solly.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'allen solly'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Peter England', ARRAY['Peter England'], ARRAY['peterengland'], ARRAY['peterengland.com'], 'peterengland.com', '/providers/peter-england.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'peter england'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Van Heusen', ARRAY['Van Heusen'], ARRAY['vanheusen'], ARRAY['vanheusenindia.com'], 'vanheusenindia.com', '/providers/van-heusen.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'van heusen'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Louis Philippe', ARRAY['Louis Philippe'], ARRAY['louisphilippe'], ARRAY['louisphilippe.com'], 'louisphilippe.com', '/providers/louis-philippe.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'louis philippe'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Fabindia', ARRAY['Fabindia'], ARRAY['fabindia'], ARRAY['fabindia.com'], 'fabindia.com', '/providers/fabindia.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'fabindia'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Biba', ARRAY['Biba'], ARRAY['biba'], ARRAY['biba.in'], 'biba.in', '/providers/biba.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'biba'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'W for Woman', ARRAY['W for Woman', 'WforWoman'], ARRAY['wforwoman'], ARRAY['wforwoman.com'], 'wforwoman.com', '/providers/w-for-woman.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'w for woman'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Myntra', ARRAY['Myntra', 'Myntra Designs'], ARRAY['myntra'], ARRAY['myntra.com'], 'myntra.com', '/providers/myntra.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'myntra'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Meesho', ARRAY['Meesho', 'Fashnear'], ARRAY['meesho', 'fashnear'], ARRAY['meesho.com'], 'meesho.com', '/providers/meesho.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'meesho'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Tata CLiQ', ARRAY['Tata CLiQ', 'Tata Cliq'], ARRAY['tatacliq'], ARRAY['tatacliq.com'], 'tatacliq.com', '/providers/tata-cliq.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'tata cliq'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Croma', ARRAY['Croma', 'Infiniti Retail'], ARRAY['croma', 'infinitiretail'], ARRAY['croma.com'], 'croma.com', '/providers/croma.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'croma'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Bewakoof', ARRAY['Bewakoof'], ARRAY['bewakoof'], ARRAY['bewakoof.com'], 'bewakoof.com', '/providers/bewakoof.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'bewakoof'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Snitch', ARRAY['Snitch'], ARRAY['snitch'], ARRAY['snitch.co.in'], 'snitch.co.in', '/providers/snitch.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'snitch'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'The Souled Store', ARRAY['The Souled Store', 'Souled Store'], ARRAY['thesouledstore', 'souledstore'], ARRAY['thesouledstore.com'], 'thesouledstore.com', '/providers/souled-store.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'the souled store'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Uniqlo', ARRAY['Uniqlo'], ARRAY['uniqlo'], ARRAY['uniqlo.com'], 'uniqlo.com', '/providers/uniqlo.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'uniqlo'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Marks & Spencer', ARRAY['Marks & Spencer', 'Marks and Spencer', 'M&S'], ARRAY['marksandspencer', 'marksspencer'], ARRAY['marksandspencer.in'], 'marksandspencer.in', '/providers/marks-spencer.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'marks & spencer'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Lenskart', ARRAY['Lenskart'], ARRAY['lenskart'], ARRAY['lenskart.com'], 'lenskart.com', '/providers/lenskart.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'lenskart'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Titan', ARRAY['Titan', 'Titan Eyeplus'], ARRAY['titan', 'titaneyeplus'], ARRAY['titan.co.in'], 'titan.co.in', '/providers/titan.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'titan'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Tanishq', ARRAY['Tanishq'], ARRAY['tanishq'], ARRAY['tanishq.co.in'], 'tanishq.co.in', '/providers/tanishq.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'tanishq'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'boAt', ARRAY['boAt', 'boAt Lifestyle', 'Imagine Marketing'], ARRAY['boatlifestyle', 'imaginemarketing'], ARRAY['boat-lifestyle.com'], 'boat-lifestyle.com', '/providers/boat.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'boat'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Mamaearth', ARRAY['Mamaearth', 'Honasa'], ARRAY['mamaearth', 'honasa'], ARRAY['mamaearth.in'], 'mamaearth.in', '/providers/mamaearth.svg', 'personal', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'mamaearth'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Sugar Cosmetics', ARRAY['Sugar Cosmetics', 'SUGAR'], ARRAY['sugarcosmetics'], ARRAY['sugarcosmetics.com'], 'sugarcosmetics.com', '/providers/sugar-cosmetics.svg', 'personal', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'sugar cosmetics'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Purplle', ARRAY['Purplle'], ARRAY['purplle'], ARRAY['purplle.com'], 'purplle.com', '/providers/purplle.svg', 'personal', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'purplle'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'FirstCry', ARRAY['FirstCry', 'First Cry'], ARRAY['firstcry'], ARRAY['firstcry.com'], 'firstcry.com', '/providers/firstcry.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'firstcry'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'DMart', ARRAY['DMart', 'D-Mart', 'Avenue Supermarts'], ARRAY['dmart', 'avenuesupermarts'], ARRAY['dmart.in'], 'dmart.in', '/providers/dmart.svg', 'grocery', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'dmart'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'BigBasket', ARRAY['BigBasket', 'Big Basket'], ARRAY['bigbasket'], ARRAY['bigbasket.com'], 'bigbasket.com', '/providers/bigbasket.svg', 'grocery', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'bigbasket'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'IKEA', ARRAY['IKEA'], ARRAY['ikea'], ARRAY['ikea.com'], 'ikea.com', '/providers/ikea.svg', 'household', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'ikea'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Wakefit', ARRAY['Wakefit'], ARRAY['wakefit'], ARRAY['wakefit.co'], 'wakefit.co', '/providers/wakefit.svg', 'household', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'wakefit'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Urban Company', ARRAY['Urban Company', 'UrbanClap'], ARRAY['urbancompany', 'urbanclap'], ARRAY['urbancompany.com'], 'urbancompany.com', '/providers/urban-company.svg', 'personal', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'urban company'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'PharmEasy', ARRAY['PharmEasy'], ARRAY['pharmeasy'], ARRAY['pharmeasy.in'], 'pharmeasy.in', '/providers/pharmeasy.svg', 'pharmacy', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'pharmeasy'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Netmeds', ARRAY['Netmeds'], ARRAY['netmeds'], ARRAY['netmeds.com'], 'netmeds.com', '/providers/netmeds.svg', 'pharmacy', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'netmeds'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Tata 1mg', ARRAY['Tata 1mg', '1mg'], ARRAY['onemg', '1mg'], ARRAY['1mg.com'], '1mg.com', '/providers/tata-1mg.svg', 'pharmacy', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'tata 1mg'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Cult.fit', ARRAY['Cult.fit', 'Cultfit', 'Cure.fit'], ARRAY['cultfit', 'curefit'], ARRAY['cult.fit'], 'cult.fit', '/providers/cultfit.svg', 'sports', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'cult.fit'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Starbucks', ARRAY['Starbucks', 'Tata Starbucks'], ARRAY['starbucks', 'tatastarbucks'], ARRAY['starbucks.in'], 'starbucks.in', '/providers/starbucks.svg', 'food', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'starbucks'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'McDonald''s', ARRAY['McDonald''s', 'McDonalds'], ARRAY['mcdonalds'], ARRAY['mcdonaldsindia.com'], 'mcdonaldsindia.com', '/providers/mcdonalds.svg', 'food', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'mcdonald''s'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'KFC', ARRAY['KFC', 'Kentucky Fried Chicken'], ARRAY['kfc'], ARRAY['kfc.co.in'], 'online.kfc.co.in', '/providers/kfc.svg', 'food', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'kfc'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Burger King', ARRAY['Burger King'], ARRAY['burgerking'], ARRAY['burgerking.in'], 'burgerking.in', '/providers/burger-king.svg', 'food', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'burger king'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Chaayos', ARRAY['Chaayos'], ARRAY['chaayos'], ARRAY['chaayos.com'], 'chaayos.com', '/providers/chaayos.svg', 'food', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'chaayos'
);

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Reliance Retail', ARRAY['Reliance Retail', 'Reliance Retail Ventures', 'RRVL'], ARRAY['relianceretail', 'rrvl'], ARRAY['relianceretail.com'], 'relianceretail.com', '/providers/reliance-retail.svg', 'shopping', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'reliance retail'
);

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'reliance trends'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])reliance trends([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliance trends([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliance trends([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])reliancetrends([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliancetrends([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliancetrends([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])trends footwear([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])trends footwear([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])trends footwear([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'reliance digital'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])reliance digital([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliance digital([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliance digital([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])reliancedigital([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliancedigital([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliancedigital([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'ajio'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])ajio([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])ajio([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])ajio([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'jiomart'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])jiomart([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])jiomart([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])jiomart([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])jio mart([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])jio mart([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])jio mart([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'reliance fresh'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])reliance fresh([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliance fresh([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliance fresh([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])reliancefresh([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliancefresh([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliancefresh([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'smart bazaar'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])smart bazaar([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])smart bazaar([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])smart bazaar([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])smartbazaar([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])smartbazaar([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])smartbazaar([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])reliance smart([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliance smart([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliance smart([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'nykaa'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])nykaa([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])nykaa([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])nykaa([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])fsn e-commerce([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])fsn e-commerce([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])fsn e-commerce([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])fsn ecommerce([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])fsn ecommerce([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])fsn ecommerce([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'westside'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])westside([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])westside([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])westside([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])trent limited([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])trent limited([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])trent limited([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])trent ltd([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])trent ltd([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])trent ltd([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'pantaloons'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])pantaloons([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])pantaloons([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])pantaloons([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])aditya birla fashion([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])aditya birla fashion([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])aditya birla fashion([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])abfrl([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])abfrl([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])abfrl([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'levi''s'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])levi strauss([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])levi strauss([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])levi strauss([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])levi''s([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])levi''s([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])levi''s([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])levis([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])levis([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])levis([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'max fashion'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])max fashion([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])max fashion([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])max fashion([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])maxfashion([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])maxfashion([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])maxfashion([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'lifestyle'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])lifestyle stores([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])lifestyle stores([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])lifestyle stores([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])lifestylestores([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])lifestylestores([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])lifestylestores([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'shoppers stop'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])shoppers stop([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])shoppers stop([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])shoppers stop([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])shoppersstop([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])shoppersstop([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])shoppersstop([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'zara'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])zara([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])zara([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])zara([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'h&m'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])h&m([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])h&m([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])h&m([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])h and m([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])h and m([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])h and m([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])hennes([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])hennes([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])hennes([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'decathlon'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])decathlon([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])decathlon([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])decathlon([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'nike'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])nike([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])nike([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])nike([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'adidas'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])adidas([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])adidas([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])adidas([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'puma'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])puma([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])puma([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])puma([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'bata'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])bata([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])bata([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])bata([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'skechers'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])skechers([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])skechers([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])skechers([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'woodland'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])woodland([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])woodland([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])woodland([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'metro shoes'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])metro shoes([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])metro shoes([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])metro shoes([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])metroshoes([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])metroshoes([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])metroshoes([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])mochi shoes([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])mochi shoes([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])mochi shoes([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'allen solly'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])allen solly([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])allen solly([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])allen solly([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])allensolly([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])allensolly([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])allensolly([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'peter england'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])peter england([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])peter england([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])peter england([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])peterengland([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])peterengland([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])peterengland([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'van heusen'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])van heusen([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])van heusen([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])van heusen([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])vanheusen([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])vanheusen([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])vanheusen([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'louis philippe'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])louis philippe([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])louis philippe([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])louis philippe([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])louisphilippe([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])louisphilippe([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])louisphilippe([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'fabindia'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])fabindia([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])fabindia([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])fabindia([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'biba'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])biba([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])biba([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])biba([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'w for woman'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])w for woman([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])w for woman([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])w for woman([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])wforwoman([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])wforwoman([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])wforwoman([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'myntra'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])myntra([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])myntra([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])myntra([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'meesho'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])meesho([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])meesho([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])meesho([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])fashnear([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])fashnear([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])fashnear([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'tata cliq'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])tata cliq([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])tata cliq([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])tata cliq([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])tatacliq([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])tatacliq([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])tatacliq([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'croma'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])croma([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])croma([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])croma([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])infiniti retail([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])infiniti retail([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])infiniti retail([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'bewakoof'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])bewakoof([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])bewakoof([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])bewakoof([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'snitch'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])snitch([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])snitch([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])snitch([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'the souled store'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])souled store([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])souled store([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])souled store([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])thesouledstore([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])thesouledstore([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])thesouledstore([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])souledstore([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])souledstore([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])souledstore([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'uniqlo'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])uniqlo([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])uniqlo([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])uniqlo([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'marks & spencer'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])marks & spencer([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])marks & spencer([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])marks & spencer([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])marks and spencer([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])marks and spencer([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])marks and spencer([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])marksandspencer([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])marksandspencer([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])marksandspencer([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'lenskart'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])lenskart([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])lenskart([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])lenskart([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'titan'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])titan eyeplus([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])titan eyeplus([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])titan eyeplus([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])titaneyeplus([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])titaneyeplus([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])titaneyeplus([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])titan([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])titan([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])titan([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'tanishq'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])tanishq([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])tanishq([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])tanishq([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'boat'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])boat lifestyle([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])boat lifestyle([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])boat lifestyle([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])boatlifestyle([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])boatlifestyle([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])boatlifestyle([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])imagine marketing([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])imagine marketing([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])imagine marketing([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'mamaearth'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])mamaearth([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])mamaearth([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])mamaearth([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])honasa([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])honasa([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])honasa([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'sugar cosmetics'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])sugar cosmetics([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])sugar cosmetics([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])sugar cosmetics([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])sugarcosmetics([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])sugarcosmetics([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])sugarcosmetics([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'purplle'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])purplle([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])purplle([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])purplle([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'firstcry'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])firstcry([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])firstcry([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])firstcry([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])first cry([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])first cry([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])first cry([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'dmart'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])avenue supermarts([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])avenue supermarts([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])avenue supermarts([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])d-mart([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])d-mart([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])d-mart([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])dmart([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])dmart([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])dmart([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'bigbasket'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])bigbasket([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])bigbasket([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])bigbasket([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])big basket([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])big basket([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])big basket([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'ikea'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])ikea([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])ikea([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])ikea([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'wakefit'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])wakefit([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])wakefit([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])wakefit([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'urban company'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])urban company([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])urban company([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])urban company([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])urbancompany([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])urbancompany([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])urbancompany([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])urbanclap([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])urbanclap([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])urbanclap([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'pharmeasy'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])pharmeasy([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])pharmeasy([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])pharmeasy([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'netmeds'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])netmeds([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])netmeds([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])netmeds([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'tata 1mg'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])tata 1mg([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])tata 1mg([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])tata 1mg([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])1mg([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])1mg([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])1mg([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])onemg([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])onemg([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])onemg([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'cult.fit'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])cult\.fit([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])cult\.fit([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])cult\.fit([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])cultfit([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])cultfit([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])cultfit([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])cure\.fit([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])cure\.fit([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])cure\.fit([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])curefit([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])curefit([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])curefit([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'starbucks'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])tata starbucks([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])tata starbucks([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])tata starbucks([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])starbucks([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])starbucks([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])starbucks([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'mcdonald''s'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])mcdonald''s([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])mcdonald''s([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])mcdonald''s([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])mcdonalds([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])mcdonalds([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])mcdonalds([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'kfc'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])kentucky fried chicken([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])kentucky fried chicken([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])kentucky fried chicken([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])kfc([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])kfc([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])kfc([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'burger king'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])burger king([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])burger king([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])burger king([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])burgerking([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])burgerking([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])burgerking([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'chaayos'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])chaayos([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])chaayos([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])chaayos([^a-z0-9]|$)'
  );

UPDATE transactions AS txn
SET
  merchant = provider.canonical_name,
  category_slug = provider.category_slug,
  provider_id = provider.id,
  classification_source = 'provider_registry'
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'reliance retail'
  AND txn.provider_id IS NULL
  AND COALESCE(txn.classification_source, '') NOT IN ('user_override', 'telegram')
  AND COALESCE(txn.classification_source, '') NOT LIKE 'rule:%'
  AND (
    txn.description ~* '(^|[^a-z0-9])reliance retail([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])reliance retail([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])reliance retail([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])relianceretail([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])relianceretail([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])relianceretail([^a-z0-9]|$)'
    OR txn.description ~* '(^|[^a-z0-9])rrvl([^a-z0-9]|$)' OR COALESCE(txn.merchant, '') ~* '(^|[^a-z0-9])rrvl([^a-z0-9]|$)' OR COALESCE(txn.upi_id, '') ~* '(^|[^a-z0-9])rrvl([^a-z0-9]|$)'
  );
