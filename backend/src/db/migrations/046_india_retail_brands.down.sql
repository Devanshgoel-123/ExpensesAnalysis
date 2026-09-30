UPDATE categories
SET blurb = 'Amazon · Apple · Flipkart · marketplaces'
WHERE is_global = TRUE AND slug = 'shopping';

DELETE FROM providers
WHERE is_global = TRUE
  AND lower(canonical_name) IN ('reliance trends', 'reliance digital', 'ajio', 'jiomart', 'reliance fresh', 'smart bazaar', 'nykaa', 'westside', 'pantaloons', 'levi''s', 'max fashion', 'lifestyle', 'shoppers stop', 'zara', 'h&m', 'decathlon', 'nike', 'adidas', 'puma', 'bata', 'skechers', 'woodland', 'metro shoes', 'allen solly', 'peter england', 'van heusen', 'louis philippe', 'fabindia', 'biba', 'w for woman', 'myntra', 'meesho', 'tata cliq', 'croma', 'bewakoof', 'snitch', 'the souled store', 'uniqlo', 'marks & spencer', 'lenskart', 'titan', 'tanishq', 'boat', 'mamaearth', 'sugar cosmetics', 'purplle', 'firstcry', 'dmart', 'bigbasket', 'ikea', 'wakefit', 'urban company', 'pharmeasy', 'netmeds', 'tata 1mg', 'cult.fit', 'starbucks', 'mcdonald''s', 'kfc', 'burger king', 'chaayos', 'reliance retail');
