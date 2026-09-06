/**
 * Bhoomija — Sheet → Shopify product uploader
 *
 * Paste this into Extensions → Apps Script on the product sheet, save, reload
 * the sheet, then use the "Bhoomija" menu.
 *
 * First run: Bhoomija → Setup → Set Shopify credentials.
 * Then: select any cells covering the rows you want, and
 *       Bhoomija → Upload selected rows.
 *
 * Columns are found by their header text in row 2, so inserting or moving
 * columns will not break this.
 */

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

var CONFIG = {
  SHEET_NAME: 'Main Product Sheet | Aniket',
  HEADER_ROW: 2,          // row holding the field names
  FIRST_DATA_ROW: 3,
  API_VERSION: '2025-01',

  // Products are created as DRAFT so a bad run never hits the live store.
  // Change to 'ACTIVE' once you trust the mapping.
  PRODUCT_STATUS: 'DRAFT',

  // Pause between products (ms). Shopify throttles bursts; 600ms is safe.
  THROTTLE_MS: 600
};

/** Sheet header text → internal field name. Match is case/space-insensitive. */
var COLUMN_MAP = {
  'S. No.':                                                'serial',
  'Categories':                                            'category',
  'Sub Category':                                          'subCategory',
  'Brief Product Description':                             'briefDescription',
  'Unit / Qty':                                            'quantity',
  'Region':                                                'region',
  'Bhoomija Selling Price':                                'price',
  'Product Title - only if different from Brief Description': 'title',
  'Product Description (50-70 words)':                     'description',
  'Key Features (separate with | )':                       'keyFeatures',
  'Craft / Technique':                                     'craft',
  'Material':                                              'material',
  'Care Instructions':                                     'care',
  'Artisan / Cluster Name':                                'artisan',
  'Tags / Search Keywords':                                'keywords',
  'MRP (Rs)':                                              'mrp',
  'HSN Code':                                              'hsn',
  'Weight - packed (grams)':                               'weight',
  'SKU Code':                                              'sku',
  'Shopify Handle / URL':                                  'handle',
  'Listing Status':                                        'status',
  'Developer Notes':                                       'notes',
  // Optional — add this column yourself and fill with public HTTPS image URLs
  // (comma separated). Google Drive links do NOT work; Shopify cannot read them.
  'Image URLs':                                            'imageUrls'
};

/** Product metafields written under the `custom` namespace. */
var METAFIELDS = [
  { key: 'craft_technique',  name: 'Craft / Technique',  field: 'craft' },
  { key: 'material',         name: 'Material',           field: 'material' },
  { key: 'care_instructions',name: 'Care Instructions',  field: 'care' },
  { key: 'region',           name: 'Region',             field: 'region' },
  { key: 'artisan_cluster',  name: 'Artisan / Cluster',  field: 'artisan' }
];

// ─────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bhoomija')
    .addItem('Preview selected rows', 'previewSelectedRows')
    .addItem('Upload selected rows', 'uploadSelectedRows')
    .addSeparator()
    .addItem('Re-upload selected (ignore "Uploaded")', 'forceUploadSelectedRows')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Setup')
      .addItem('Set Shopify credentials', 'setCredentials')
      .addItem('Test connection', 'testConnection')
      .addItem('Create metafield definitions', 'createMetafieldDefinitions'))
    .addToUi();
}

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────

function setCredentials() {
  var ui = SpreadsheetApp.getUi();

  var d = ui.prompt('Shopify store domain',
    'e.g. bhoomija.myshopify.com  (not bhoomija.in)', ui.ButtonSet.OK_CANCEL);
  if (d.getSelectedButton() !== ui.Button.OK) return;

  var t = ui.prompt('Admin API access token',
    'Admin → Settings → Apps and sales channels → Develop apps → your app → ' +
    'API credentials → Admin API access token (starts with shpat_)',
    ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;

  PropertiesService.getScriptProperties().setProperties({
    SHOP_DOMAIN: d.getResponseText().trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
    ADMIN_TOKEN: t.getResponseText().trim()
  });

  ui.alert('Saved. Now run Setup → Test connection.');
}

function testConnection() {
  try {
    var r = gql('{ shop { name myshopifyDomain currencyCode } ' +
                '  locations(first:1) { nodes { id name } } }', {});
    SpreadsheetApp.getUi().alert(
      'Connected\n\n' +
      'Shop: ' + r.shop.name + '\n' +
      'Domain: ' + r.shop.myshopifyDomain + '\n' +
      'Currency: ' + r.shop.currencyCode + '\n' +
      'Location: ' + r.locations.nodes[0].name);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Connection failed\n\n' + e.message);
  }
}

function createMetafieldDefinitions() {
  var created = [], skipped = [];

  METAFIELDS.forEach(function (m) {
    var res = gql(
      'mutation($def: MetafieldDefinitionInput!) {' +
      '  metafieldDefinitionCreate(definition:$def) {' +
      '    createdDefinition { id key }' +
      '    userErrors { code message }' +
      '  } }',
      { def: {
          name: m.name,
          namespace: 'custom',
          key: m.key,
          type: 'single_line_text_field',
          ownerType: 'PRODUCT',
          access: { storefront: 'PUBLIC_READ' }
        } });

    var errs = res.metafieldDefinitionCreate.userErrors;
    if (errs.length && errs[0].code === 'TAKEN') skipped.push(m.key);
    else if (errs.length) skipped.push(m.key + ' (' + errs[0].message + ')');
    else created.push(m.key);
  });

  SpreadsheetApp.getUi().alert(
    'Metafield definitions\n\n' +
    'Created: ' + (created.join(', ') || '—') + '\n' +
    'Already existed: ' + (skipped.join(', ') || '—'));
}

// ─────────────────────────────────────────────────────────────
// Menu actions
// ─────────────────────────────────────────────────────────────

function previewSelectedRows() { runSelected(true,  false); }
function uploadSelectedRows()  { runSelected(false, false); }
function forceUploadSelectedRows() { runSelected(false, true); }

function runSelected(dryRun, force) {
  var ui = SpreadsheetApp.getUi();
  var ctx;

  try {
    ctx = buildContext();
  } catch (e) {
    ui.alert(e.message);
    return;
  }

  var rowNumbers = selectedDataRows(ctx.sheet);
  if (!rowNumbers.length) {
    ui.alert('Select some cells first.\n\n' +
             'Any selection works — click a row number, or drag over a range. ' +
             'Every row you touch gets processed.');
    return;
  }

  var products = [];
  var problems = [];

  rowNumbers.forEach(function (rowNum) {
    var raw = ctx.sheet.getRange(rowNum, 1, 1, ctx.width).getValues()[0];
    var row = readRow(raw, ctx.cols);
    if (!row.briefDescription && !row.title) return;   // blank row

    if (!force && String(row.status || '').toLowerCase().indexOf('uploaded') === 0) {
      problems.push('Row ' + rowNum + ': already uploaded (skipped)');
      return;
    }

    var issues = validate(row);
    if (issues.length) {
      problems.push('Row ' + rowNum + ': ' + issues.join('; '));
      return;
    }
    products.push({ rowNum: rowNum, row: row });
  });

  if (dryRun) {
    ui.alert(previewText(products, problems, ctx));
    return;
  }

  if (!products.length) {
    ui.alert('Nothing to upload.\n\n' + problems.join('\n'));
    return;
  }

  var confirm = ui.alert(
    'Upload ' + products.length + ' product' + (products.length === 1 ? '' : 's') + '?',
    'Status: ' + CONFIG.PRODUCT_STATUS + '\n' +
    'Store: ' + ctx.shopDomain + '\n\n' +
    (problems.length ? problems.length + ' row(s) will be skipped.\n\n' : '') +
    'This writes to the live store.',
    ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) return;

  var ok = 0, failed = [];

  products.forEach(function (p, i) {
    try {
      var result = createProduct(p.row, ctx);
      writeBack(ctx, p.rowNum, {
        sku:    result.sku,
        handle: result.handle,
        status: 'Uploaded ' + new Date().toISOString().slice(0, 10),
        notes:  result.notes
      });
      ok++;
    } catch (e) {
      failed.push('Row ' + p.rowNum + ': ' + e.message);
      writeBack(ctx, p.rowNum, { status: 'Failed', notes: String(e.message).slice(0, 300) });
    }
    if (i < products.length - 1) Utilities.sleep(CONFIG.THROTTLE_MS);
  });

  ui.alert(
    'Done\n\n' +
    'Uploaded: ' + ok + '\n' +
    'Failed: ' + failed.length + '\n' +
    'Skipped: ' + problems.length +
    (failed.length ? '\n\n' + failed.join('\n') : '') +
    (problems.length ? '\n\nSkipped:\n' + problems.join('\n') : ''));
}

// ─────────────────────────────────────────────────────────────
// Sheet reading
// ─────────────────────────────────────────────────────────────

function buildContext() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();

  var width = sheet.getLastColumn();
  var headers = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, width).getValues()[0];

  var cols = {};
  headers.forEach(function (h, i) {
    var key = COLUMN_MAP[normalizeHeader(h, headers)];
    if (key) cols[key] = i;
  });

  ['category', 'briefDescription', 'price'].forEach(function (required) {
    if (cols[required] === undefined) {
      throw new Error('Could not find the "' + required + '" column in row ' +
                      CONFIG.HEADER_ROW + ' of "' + sheet.getName() + '".');
    }
  });

  var props = PropertiesService.getScriptProperties();
  var shopDomain = props.getProperty('SHOP_DOMAIN');
  if (!shopDomain) throw new Error('Run Bhoomija → Setup → Set Shopify credentials first.');

  return {
    sheet: sheet,
    width: width,
    cols: cols,
    shopDomain: shopDomain,
    locationId: null   // resolved lazily on first upload
  };
}

/** Exact header match, falling back to a normalized comparison. */
function normalizeHeader(h, allHeaders) {
  if (h === null || h === undefined) return '';
  var raw = String(h).trim();
  if (COLUMN_MAP[raw]) return raw;

  var squashed = raw.toLowerCase().replace(/\s+/g, ' ');
  for (var key in COLUMN_MAP) {
    if (key.toLowerCase().replace(/\s+/g, ' ') === squashed) return key;
  }
  return raw;
}

function selectedDataRows(sheet) {
  var ranges = sheet.getActiveRangeList()
    ? sheet.getActiveRangeList().getRanges()
    : [sheet.getActiveRange()];

  var seen = {}, out = [];
  ranges.forEach(function (r) {
    for (var i = 0; i < r.getNumRows(); i++) {
      var rowNum = r.getRow() + i;
      if (rowNum < CONFIG.FIRST_DATA_ROW) continue;
      if (seen[rowNum]) continue;
      seen[rowNum] = true;
      out.push(rowNum);
    }
  });
  return out.sort(function (a, b) { return a - b; });
}

function readRow(raw, cols) {
  var row = {};
  for (var key in cols) {
    var v = raw[cols[key]];
    row[key] = (v === null || v === undefined) ? '' : String(v).trim();
  }
  return row;
}

function validate(row) {
  var issues = [];
  if (!row.category) issues.push('no Category');
  if (!row.price || isNaN(parseFloat(row.price))) issues.push('no/invalid Price');
  if (!row.briefDescription && !row.title) issues.push('no Title or Brief Description');
  return issues;
}

// ─────────────────────────────────────────────────────────────
// Payload building
// ─────────────────────────────────────────────────────────────

function buildTitle(row) {
  return row.title || row.briefDescription;
}

function buildDescriptionHtml(row) {
  var parts = [];
  if (row.description) parts.push('<p>' + escapeHtml(row.description) + '</p>');

  if (row.keyFeatures) {
    var items = row.keyFeatures.split('|')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .map(function (s) { return '<li>' + escapeHtml(s) + '</li>'; });
    if (items.length) parts.push('<ul>' + items.join('') + '</ul>');
  }

  var spec = [];
  if (row.craft)    spec.push('<strong>Craft:</strong> '    + escapeHtml(row.craft));
  if (row.material) spec.push('<strong>Material:</strong> ' + escapeHtml(row.material));
  if (row.region)   spec.push('<strong>Region:</strong> '   + escapeHtml(row.region));
  if (row.artisan && row.artisan !== row.region) {
    spec.push('<strong>Artisan / Cluster:</strong> ' + escapeHtml(row.artisan));
  }
  if (row.care)     spec.push('<strong>Care:</strong> '     + escapeHtml(row.care));
  if (spec.length) parts.push('<p>' + spec.join('<br>') + '</p>');

  return parts.join('\n');
}

function buildTags(row) {
  var tags = [];
  if (row.category)    tags.push(row.category);
  if (row.subCategory) tags.push(row.subCategory);
  if (row.region)      tags.push(row.region);
  if (row.craft)       tags.push(row.craft);
  if (row.keywords) {
    row.keywords.split(/[,;|]/).forEach(function (t) {
      t = t.trim();
      if (t) tags.push(t);
    });
  }
  // de-dupe, preserve order
  var seen = {}, out = [];
  tags.forEach(function (t) {
    var k = t.toLowerCase();
    if (!seen[k]) { seen[k] = true; out.push(t); }
  });
  return out;
}

function buildSku(row) {
  if (row.sku) return row.sku;
  var n = String(row.serial || '').replace(/\D/g, '');
  return n ? 'Bhoomija' + n : '';
}

function buildImageUrls(row) {
  if (!row.imageUrls) return [];
  return row.imageUrls.split(/[,\s]+/)
    .map(function (u) { return u.trim(); })
    .filter(function (u) { return /^https:\/\//i.test(u) && u.indexOf('drive.google.com') === -1; });
}

// ─────────────────────────────────────────────────────────────
// Shopify writes
// ─────────────────────────────────────────────────────────────

function createProduct(row, ctx) {
  var title = buildTitle(row);
  var notes = [];

  // 1. Create the product shell
  var created = gql(
    'mutation($input: ProductInput!) {' +
    '  productCreate(input:$input) {' +
    '    product { id handle variants(first:1){nodes{id inventoryItem{id}}} }' +
    '    userErrors { field message }' +
    '  } }',
    { input: {
        title: title,
        descriptionHtml: buildDescriptionHtml(row),
        vendor: row.region || 'Bhoomija',
        productType: row.subCategory || row.category,
        tags: buildTags(row),
        status: CONFIG.PRODUCT_STATUS
      } });

  throwOnErrors(created.productCreate.userErrors, 'productCreate');
  var product = created.productCreate.product;
  var variant = product.variants.nodes[0];

  // 2. Price + SKU + inventory tracking on the default variant
  var sku = buildSku(row);
  var variantInput = {
    id: variant.id,
    price: String(parseFloat(row.price).toFixed(2)),
    inventoryItem: { tracked: true }
  };
  if (sku) variantInput.inventoryItem.sku = sku;
  if (row.mrp && !isNaN(parseFloat(row.mrp)) && parseFloat(row.mrp) > parseFloat(row.price)) {
    variantInput.compareAtPrice = String(parseFloat(row.mrp).toFixed(2));
  }
  if (row.weight && !isNaN(parseFloat(row.weight))) {
    variantInput.inventoryItem.measurement = {
      weight: { value: parseFloat(row.weight), unit: 'GRAMS' }
    };
  }

  var variantUpdate = gql(
    'mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {' +
    '  productVariantsBulkUpdate(productId:$productId, variants:$variants) {' +
    '    productVariants { id sku }' +
    '    userErrors { field message }' +
    '  } }',
    { productId: product.id, variants: [variantInput] });
  throwOnErrors(variantUpdate.productVariantsBulkUpdate.userErrors, 'variant update');

  // 3. Images (only real public HTTPS URLs — Drive links are skipped)
  var images = buildImageUrls(row);
  if (images.length) {
    var media = gql(
      'mutation($productId: ID!, $media: [CreateMediaInput!]!) {' +
      '  productCreateMedia(productId:$productId, media:$media) {' +
      '    mediaUserErrors { field message }' +
      '  } }',
      { productId: product.id,
        media: images.map(function (u) {
          return { originalSource: u, alt: title, mediaContentType: 'IMAGE' };
        }) });
    var mediaErrs = media.productCreateMedia.mediaUserErrors;
    if (mediaErrs.length) notes.push('image warning: ' + mediaErrs[0].message);
  } else {
    notes.push('no image');
  }

  // 4. Metafields
  var metafields = METAFIELDS
    .filter(function (m) { return row[m.field]; })
    .map(function (m) {
      return {
        ownerId: product.id,
        namespace: 'custom',
        key: m.key,
        type: 'single_line_text_field',
        value: row[m.field]
      };
    });
  if (metafields.length) {
    var mf = gql(
      'mutation($metafields: [MetafieldsSetInput!]!) {' +
      '  metafieldsSet(metafields:$metafields) { userErrors { field message } } }',
      { metafields: metafields });
    var mfErrs = mf.metafieldsSet.userErrors;
    if (mfErrs.length) notes.push('metafield warning: ' + mfErrs[0].message);
  }

  // 5. Inventory quantity
  var qty = parseInt(row.quantity, 10);
  if (!isNaN(qty) && qty > 0) {
    try {
      setInventory(ctx, variant.inventoryItem.id, qty);
    } catch (e) {
      notes.push('inventory warning: ' + e.message);
    }
  }

  return { id: product.id, handle: product.handle, sku: sku, notes: notes.join('; ') };
}

function setInventory(ctx, inventoryItemId, qty) {
  if (!ctx.locationId) {
    var loc = gql('{ locations(first:1) { nodes { id } } }', {});
    if (!loc.locations.nodes.length) throw new Error('no location found');
    ctx.locationId = loc.locations.nodes[0].id;
  }

  var res = gql(
    'mutation($input: InventorySetQuantitiesInput!) {' +
    '  inventorySetQuantities(input:$input) { userErrors { field message } } }',
    { input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: [{
          inventoryItemId: inventoryItemId,
          locationId: ctx.locationId,
          quantity: qty
        }]
      } });
  throwOnErrors(res.inventorySetQuantities.userErrors, 'inventory');
}

// ─────────────────────────────────────────────────────────────
// Write-back
// ─────────────────────────────────────────────────────────────

function writeBack(ctx, rowNum, values) {
  Object.keys(values).forEach(function (key) {
    var col = ctx.cols[key];
    if (col === undefined || !values[key]) return;
    var cell = ctx.sheet.getRange(rowNum, col + 1);
    if (key === 'handle') {
      cell.setValue('https://' + ctx.shopDomain.replace('.myshopify.com', '') +
                    '.myshopify.com/products/' + values[key]);
    } else {
      cell.setValue(values[key]);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Preview
// ─────────────────────────────────────────────────────────────

function previewText(products, problems, ctx) {
  var lines = ['PREVIEW — nothing was sent to Shopify', ''];
  lines.push('Store: ' + ctx.shopDomain);
  lines.push('Status products would get: ' + CONFIG.PRODUCT_STATUS);
  lines.push('Ready to upload: ' + products.length);
  lines.push('');

  products.slice(0, 6).forEach(function (p) {
    var r = p.row;
    lines.push('Row ' + p.rowNum + ' — ' + buildTitle(r));
    lines.push('   SKU: ' + (buildSku(r) || '(none)') +
               '   Price: ₹' + r.price +
               '   Qty: ' + (r.quantity || '0'));
    lines.push('   Vendor: ' + (r.region || 'Bhoomija') +
               '   Type: ' + (r.subCategory || r.category));
    lines.push('   Tags: ' + buildTags(r).join(', '));
    lines.push('   Images: ' + (buildImageUrls(r).length || 'none'));
    lines.push('');
  });
  if (products.length > 6) lines.push('...and ' + (products.length - 6) + ' more');

  if (problems.length) {
    lines.push('');
    lines.push('WILL BE SKIPPED:');
    problems.slice(0, 10).forEach(function (p) { lines.push('  ' + p); });
    if (problems.length > 10) lines.push('  ...and ' + (problems.length - 10) + ' more');
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Shopify GraphQL transport
// ─────────────────────────────────────────────────────────────

function gql(query, variables) {
  var props = PropertiesService.getScriptProperties();
  var domain = props.getProperty('SHOP_DOMAIN');
  var token = props.getProperty('ADMIN_TOKEN');
  if (!domain || !token) throw new Error('Shopify credentials not set.');

  var url = 'https://' + domain + '/admin/api/' + CONFIG.API_VERSION + '/graphql.json';

  for (var attempt = 0; attempt < 4; attempt++) {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Shopify-Access-Token': token },
      payload: JSON.stringify({ query: query, variables: variables }),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    var body = res.getContentText();

    if (code === 429 || code >= 500) {
      Utilities.sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    if (code !== 200) {
      throw new Error('HTTP ' + code + ': ' + body.slice(0, 300));
    }

    var json = JSON.parse(body);

    if (json.errors) {
      var throttled = json.errors.some(function (e) {
        return e.extensions && e.extensions.code === 'THROTTLED';
      });
      if (throttled) {
        Utilities.sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      throw new Error(json.errors.map(function (e) { return e.message; }).join('; '));
    }
    return json.data;
  }
  throw new Error('Shopify kept throttling after 4 attempts.');
}

function throwOnErrors(errors, label) {
  if (errors && errors.length) {
    throw new Error(label + ': ' + errors.map(function (e) {
      return (e.field ? e.field + ' — ' : '') + e.message;
    }).join('; '));
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
