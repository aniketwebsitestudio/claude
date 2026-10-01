/**
 * Bhoomija — Sheet → Shopify product uploader (with Drive images)
 *
 * Paste into Extensions → Apps Script on the product sheet, save, reload the
 * sheet, then use the "Bhoomija" menu.
 *
 * Images: column AD holds comma-separated filenames, column AE is a link to
 * the Drive folder holding them. The script reads that folder as you, pulls
 * each file's bytes, pushes them to Shopify via staged uploads, and attaches
 * them in sheet order. Drive stays private — nothing is made public.
 *
 * Columns are resolved by their header text in row 2, so moving or inserting
 * columns will not break anything.
 */

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

var CONFIG = {
  SHEET_NAME: 'Main Product Sheet | Aniket',
  HEADER_ROW: 2,
  FIRST_DATA_ROW: 3,
  API_VERSION: '2025-01',

  // Products land as DRAFT so a bad run can't hit the live storefront.
  // Flip to 'ACTIVE' once you've checked a batch.
  PRODUCT_STATUS: 'DRAFT',

  // productCreate attaches a product to no sales channel, so even an ACTIVE
  // product is invisible until published.
  PUBLISH_TO_ONLINE_STORE: true,

  // Used when a row has no usable image (all-RAW, no filename, or no match).
  PLACEHOLDER_IMAGE_URL:
    'https://cdn.shopify.com/s/files/1/0774/6987/6271/files/dummy_630x840_ffffff_cccccc.png?v=1788714657',

  // Shopify's media pipeline takes these as-is.
  ACCEPTED_IMAGE_EXT: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'],

  // RAW camera files. Shopify rejects all of them, so they're re-rendered to
  // JPEG through Drive before upload (see prepareImageBlob).
  RAW_IMAGE_EXT: ['cr3', 'cr2', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2',
                  'dng', 'raf', 'orf', 'rw2', 'pef', 'kdc', 'dcr', 'x3f'],

  // Shopify caps product images at 25 megapixels and 20 MB, independently.
  // Anything over either goes through the same Drive re-render.
  MAX_PIXELS: 25 * 1000 * 1000,
  MAX_FILE_BYTES: 20 * 1024 * 1024,

  // Long edge Drive is asked for when re-rendering. 2048 is Shopify's own
  // recommendation for product photography (4 MP, well under both caps).
  RESIZE_LONG_EDGE: 2048,

  MAX_IMAGES_PER_PRODUCT: 10,

  // Two-letter ISO code stamped on every variant's inventory item. Every
  // product in this sheet is Indian-made.
  COUNTRY_OF_ORIGIN: 'IN',

  // Apps Script kills a run at 6 minutes. Stop cleanly at 4.5 so the rows
  // already done get written back to the sheet.
  TIME_BUDGET_MS: 4.5 * 60 * 1000,

  THROTTLE_MS: 400
};

/** Sheet header text → internal field name (case/space-insensitive match). */
var COLUMN_MAP = {
  'S. No.':                                                   'serial',
  'Categories':                                               'category',
  'Sub Category':                                             'subCategory',
  'Brief Product Description':                                'briefDescription',
  'Unit / Qty':                                               'quantity',
  'Region':                                                   'region',
  'Bhoomija Selling Price':                                   'price',
  'Notes':                                                    'sheetNotes',
  'Product Title - only if different from Brief Description': 'title',
  'Product Description (50-70 words)':                        'description',
  'Key Features (separate with | )':                          'keyFeatures',
  'Craft / Technique':                                        'craft',
  'Material':                                                 'material',
  'Care Instructions':                                        'care',
  'Artisan / Cluster Name':                                   'artisan',
  'Tags / Search Keywords':                                   'keywords',
  'MRP (Rs)':                                                 'mrp',
  'HSN Code':                                                 'hsn',
  'Weight - packed (grams)':                                  'weight',
  'Length (cm)':                                              'length',
  'Width (cm)':                                               'width',
  'Height (cm)':                                              'height',
  'Product Images - Drive folder link':                       'imageNames',
  'Processed Images - Drive folder link':                     'processedFolder',
  'Resized Aniket':                                           'processedFolder',
  'Variant Option':                                           'variantOption',
  'Variant Values':                                           'variantValues',
  'SKU Code':                                                 'sku',
  'Shopify Handle / URL':                                     'handle',
  'Listing Status':                                           'status',
  'Developer Notes':                                          'notes'
};

/**
 * The Drive-link column has no header text in row 2 (its label sits in the
 * merged row-1 banner), so it's located by position: the column immediately
 * right of the image-names column.
 */
var DRIVE_LINK_OFFSET = 1;

/**
 * Sub-category spellings in the sheet that differ from the tag the existing
 * smart collections match on. Keyed "Category|Sub Category" because the same
 * sheet value can mean different things under different parents — "Wall
 * Hanger" is its own collection under Gift Ideas but is "Embroidered Wall
 * Hanger" under Wall Art Forms.
 */
var SUBCATEGORY_ALIAS = {
  'Home|Durrie':                      'Durrie / Throw',
  'Home|Fabric Throw':                'Durrie / Throw',
  'Wearables|Mekhela Chador':         'Mekhla Chador',
  'Wearables|Wrapper':                'Mekhla Wrapper',
  'Wall Art Forms|Wall Hanger':       'Embroidered Wall Hanger'
};

/** Product metafields, all under the `custom` namespace. */
var METAFIELDS = [
  { key: 'craft_technique',   name: 'Craft / Technique',  field: 'craft' },
  { key: 'material',          name: 'Material',           field: 'material' },
  { key: 'care_instructions', name: 'Care Instructions',  field: 'care' },
  { key: 'region',            name: 'Region',             field: 'region' },
  { key: 'artisan_cluster',   name: 'Artisan / Cluster',  field: 'artisan' },
  { key: 'dimensions',        name: 'Dimensions',         field: '_dimensions' }
];

// ─────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Bhoomija')
    .addItem('Preview selected rows', 'previewSelectedRows')
    .addItem('Upload selected rows', 'uploadSelectedRows')
    .addSeparator()
    .addItem('Re-upload selected (ignore "Uploaded")', 'forceUploadSelectedRows')
    .addSeparator()
    .addSubMenu(ui.createMenu('Setup')
      .addItem('Set Shopify credentials', 'setCredentials')
      .addItem('Test connection', 'testConnection')
      .addItem('Create metafield definitions', 'createMetafieldDefinitions')
      .addItem('Use this sheet', 'bindActiveSheet')
      .addItem('Check collection tag match', 'checkCollectionMatch')
      .addItem('Check images for selected rows', 'checkImagesForSelectedRows'))
    .addToUi();
}

// ─────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────

/**
 * Editor-safe credential setup. setCredentials() opens a dialog, which only
 * renders when launched from the sheet's menu — pressing Run on it inside the
 * Apps Script editor hangs with no dialog. Fill these in, Run once, check the
 * log, then blank them out again.
 */
function setCredentialsDirect() {
  var SHOP_DOMAIN   = '';   // 'bhoomija-2.myshopify.com'
  var CLIENT_ID     = '';   // Dev Dashboard → app → Settings
  var CLIENT_SECRET = '';
  var ADMIN_TOKEN   = '';   // legacy shpat_ token instead, if you have one

  if (!SHOP_DOMAIN) { Logger.log('Fill in SHOP_DOMAIN first.'); return; }
  if (!ADMIN_TOKEN && !(CLIENT_ID && CLIENT_SECRET)) {
    Logger.log('Fill in CLIENT_ID + CLIENT_SECRET, or ADMIN_TOKEN.');
    return;
  }

  var props = {
    SHOP_DOMAIN: SHOP_DOMAIN.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  };
  if (ADMIN_TOKEN)   props.ADMIN_TOKEN   = ADMIN_TOKEN.trim();
  if (CLIENT_ID)     props.CLIENT_ID     = CLIENT_ID.trim();
  if (CLIENT_SECRET) props.CLIENT_SECRET = CLIENT_SECRET.trim();

  var store = PropertiesService.getScriptProperties();
  clearAuthProperties(store);
  store.setProperties(props);
  Logger.log('Saved (%s). Clear the values above, then run testConnectionDirect().',
    ADMIN_TOKEN ? 'static token' : 'client credentials');
}

function testConnectionDirect() {
  try {
    var r = gql('{ shop { name myshopifyDomain currencyCode } ' +
                '  locations(first:1) { nodes { id name } } }', {});
    Logger.log('Connected to %s (%s, %s). Location: %s',
      r.shop.name, r.shop.myshopifyDomain, r.shop.currencyCode,
      r.locations.nodes[0].name);
  } catch (e) {
    Logger.log('Connection failed: %s', e.message);
  }
}

function setCredentials() {
  var ui = SpreadsheetApp.getUi();

  var d = ui.prompt('Shopify store domain',
    'e.g. bhoomija-2.myshopify.com', ui.ButtonSet.OK_CANCEL);
  if (d.getSelectedButton() !== ui.Button.OK) return;

  var id = ui.prompt('Client ID',
    'Dev Dashboard → your app → Settings → Client ID.\n\n' +
    'Leave blank if using a legacy shpat_ token.', ui.ButtonSet.OK_CANCEL);
  if (id.getSelectedButton() !== ui.Button.OK) return;

  var props = {
    SHOP_DOMAIN: d.getResponseText().trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  };

  if (id.getResponseText().trim()) {
    var secret = ui.prompt('Client secret', 'Same page as the Client ID.',
      ui.ButtonSet.OK_CANCEL);
    if (secret.getSelectedButton() !== ui.Button.OK) return;
    props.CLIENT_ID = id.getResponseText().trim();
    props.CLIENT_SECRET = secret.getResponseText().trim();
  } else {
    var t = ui.prompt('Admin API access token', 'Starts with shpat_',
      ui.ButtonSet.OK_CANCEL);
    if (t.getSelectedButton() !== ui.Button.OK) return;
    if (!t.getResponseText().trim()) { ui.alert('Nothing entered — cancelled.'); return; }
    props.ADMIN_TOKEN = t.getResponseText().trim();
  }

  var store = PropertiesService.getScriptProperties();
  clearAuthProperties(store);
  store.setProperties(props);
  ui.alert('Saved. Now run Setup → Test connection.');
}

/**
 * Wipes stored auth before saving new values, so switching between a static
 * token and client credentials can't leave a stale token that keeps winning.
 */
function clearAuthProperties(store) {
  ['ADMIN_TOKEN', 'CLIENT_ID', 'CLIENT_SECRET', 'CACHED_TOKEN', 'CACHED_TOKEN_EXPIRY']
    .forEach(function (k) { store.deleteProperty(k); });
}

function testConnection() {
  try {
    var r = gql('{ shop { name myshopifyDomain currencyCode } ' +
                '  locations(first:1) { nodes { id name } } }', {});
    SpreadsheetApp.getUi().alert(
      'Connected\n\nShop: ' + r.shop.name +
      '\nDomain: ' + r.shop.myshopifyDomain +
      '\nCurrency: ' + r.shop.currencyCode +
      '\nLocation: ' + r.locations.nodes[0].name);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Connection failed\n\n' + e.message);
  }
}

function createMetafieldDefinitions() {
  var created = [], existed = [];

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
    if (errs.length && errs[0].code === 'TAKEN') existed.push(m.key);
    else if (errs.length) existed.push(m.key + ' (' + errs[0].message + ')');
    else created.push(m.key);
  });

  SpreadsheetApp.getUi().alert(
    'Metafield definitions\n\nCreated: ' + (created.join(', ') || '—') +
    '\nAlready existed: ' + (existed.join(', ') || '—'));
}

/**
 * Reports which Category/Sub Category pairs in the sheet will land in a
 * matching smart collection, without touching Shopify. Catches spelling
 * drift between the sheet and the collection rules before an upload.
 */
function checkCollectionMatch() {
  var ctx = buildContext();
  var last = ctx.sheet.getLastRow();
  var values = ctx.sheet.getRange(CONFIG.FIRST_DATA_ROW, 1,
    last - CONFIG.FIRST_DATA_ROW + 1, ctx.width).getValues();

  var conditions = {};
  gql('{ collections(first:250){ nodes { title ruleSet { rules { column condition } } } } }', {})
    .collections.nodes.forEach(function (c) {
      if (!c.ruleSet) return;
      c.ruleSet.rules.forEach(function (r) {
        if (r.column === 'TAG') conditions[r.condition] = true;
      });
    });

  var pairs = {};
  values.forEach(function (raw) {
    var row = readRow(raw, ctx.cols);
    if (!row.category || !row.subCategory) return;
    var key = row.category + '|' + row.subCategory;
    pairs[key] = (pairs[key] || 0) + 1;
  });

  var ok = 0, problems = [];
  Object.keys(pairs).sort().forEach(function (key) {
    var parts = key.split('|');
    var tag = resolveSubCategory(parts[0], parts[1]);
    var parentOk = conditions[parts[0]];
    var subOk = conditions[tag];
    if (parentOk && subOk) { ok += pairs[key]; return; }
    problems.push('  ' + pairs[key] + '×  ' + parts[0] + ' / ' + parts[1] +
      (tag !== parts[1] ? ' (→ "' + tag + '")' : '') +
      '  — missing: ' + (!parentOk ? 'parent collection' : 'sub collection'));
  });

  SpreadsheetApp.getUi().alert(
    'Collection tag match\n\n' +
    'Products landing in parent + sub: ' + ok + '\n' +
    (problems.length
      ? '\nWill miss a collection:\n' + problems.join('\n')
      : '\nEverything matches.'));
}

// ─────────────────────────────────────────────────────────────
// Menu actions
// ─────────────────────────────────────────────────────────────

/**
 * Points the script at whichever tab is open right now. Copying this script
 * into a new sheet normally means editing CONFIG.SHEET_NAME; this stores the
 * name instead, so a renamed or duplicated sheet just needs one menu click.
 */
function bindActiveSheet() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_NAME', sheet.getName());

  try {
    var ctx = buildContext();
    var found = Object.keys(ctx.cols).length;
    ui.alert('Bound to "' + sheet.getName() + '".\n\n' +
             found + ' known columns matched in row ' + CONFIG.HEADER_ROW + '.');
  } catch (e) {
    ui.alert('Bound to "' + sheet.getName() + '", but: ' + e.message);
  }
}

/**
 * Dry-run over the selected rows' images: resolves each filename in Drive and
 * asks whether Shopify would take it, converting or resizing where needed —
 * without creating a single product.
 *
 * Run this before an upload to find out exactly which files need a JPEG
 * export from the photographer.
 */
function checkImagesForSelectedRows() {
  var ui = SpreadsheetApp.getUi();
  var ctx;
  try { ctx = buildContext(); } catch (e) { ui.alert(e.message); return; }

  var rowNumbers = selectedDataRows(ctx.sheet);
  if (!rowNumbers.length) { ui.alert('Select some product rows first.'); return; }

  var lines = [], ok = 0, fixed = 0, bad = 0;
  var started = Date.now();

  rowNumbers.forEach(function (rowNum) {
    if (Date.now() - started > CONFIG.TIME_BUDGET_MS) return;

    var raw = ctx.sheet.getRange(rowNum, 1, 1, ctx.width).getValues()[0];
    var row = readRow(raw, ctx.cols);
    row._driveUrl = readDriveLink(ctx, rowNum);

    if (!row.briefDescription && !row.title) return;
    if (String(row.briefDescription).trim() === 'Filled') return;

    var label = 'Row ' + rowNum + '  ' + (buildTitle(row) || '(untitled)');
    var resolved = resolveDriveFiles(ctx, row);
    var parts = [];

    if (resolved.folderError) {
      bad++;
      parts.push('   X ' + resolved.folderError);
    } else {
      resolved.fileIds.forEach(function (fileId, i) {
        var name = resolved.matched[i] || fileId;
        try {
          var prepared = prepareImageBlob(fileId, name);
          var mb = (prepared.blob.getBytes().length / 1048576).toFixed(1);
          if (prepared.note) {
            fixed++;
            parts.push('   ~ ' + name + '  ' + prepared.note + '  (' + mb + ' MB)');
          } else {
            ok++;
            parts.push('   . ' + name + '  ok  (' + mb + ' MB)');
          }
        } catch (e) {
          bad++;
          parts.push('   X ' + name + '  ' + e.message);
        }
      });
      resolved.missing.forEach(function (n) {
        bad++;
        parts.push('   X ' + n + '  not found in Drive');
      });
    }

    resolved.unusable.forEach(function (n) { parts.push('   - ' + n + '  (no filename)'); });
    if (!parts.length) parts.push('   - no images listed');

    lines.push(label + '\n' + parts.join('\n'));
  });

  var summary = ok + ' ready, ' + fixed + ' converted or resized, ' + bad + ' need attention';
  var body = summary + '\n\n' + lines.join('\n\n');

  Logger.log(body);
  ui.alert('Image check', body.slice(0, 8000), ui.ButtonSet.OK);
}

function previewSelectedRows()     { runSelected(true,  false); }
function uploadSelectedRows()      { runSelected(false, false); }
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
             'Any selection works — click a row number or drag over a range. ' +
             'Every row you touch gets processed.');
    return;
  }

  var products = [], skipped = [];

  rowNumbers.forEach(function (rowNum) {
    var raw = ctx.sheet.getRange(rowNum, 1, 1, ctx.width).getValues()[0];
    var row = readRow(raw, ctx.cols);
    row._rowNum = rowNum;
    row._driveUrl = readDriveLink(ctx, rowNum);

    if (!row.briefDescription && !row.title) return;            // blank row
    if (String(row.briefDescription).trim() === 'Filled') return; // template row

    if (!force && String(row.status || '').toLowerCase().indexOf('uploaded') === 0) {
      skipped.push('Row ' + rowNum + ': already uploaded');
      return;
    }

    var issues = validate(row);
    if (issues.length) {
      skipped.push('Row ' + rowNum + ': ' + issues.join('; '));
      return;
    }
    products.push(row);
  });

  if (dryRun) {
    ui.alert(previewText(products, skipped, ctx));
    return;
  }

  if (!products.length) {
    ui.alert('Nothing to upload.\n\n' + skipped.join('\n'));
    return;
  }

  var confirm = ui.alert(
    'Upload ' + products.length + ' product' + (products.length === 1 ? '' : 's') + '?',
    'Store: ' + ctx.shopDomain + '\n' +
    'Status: ' + CONFIG.PRODUCT_STATUS + '\n' +
    'Images pulled from Drive and uploaded to Shopify.\n' +
    (skipped.length ? '\n' + skipped.length + ' row(s) will be skipped.\n' : '') +
    '\nThis writes to the live store.',
    ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) return;

  var started = Date.now();
  var ok = 0, failed = [], ranOutOfTime = false;

  for (var i = 0; i < products.length; i++) {
    if (Date.now() - started > CONFIG.TIME_BUDGET_MS) {
      ranOutOfTime = true;
      break;
    }

    var row = products[i];
    try {
      var result = createProduct(row, ctx);
      writeBack(ctx, row._rowNum, {
        sku:    result.sku,
        handle: result.handle,
        status: 'Uploaded ' + new Date().toISOString().slice(0, 10),
        notes:  result.notes
      });
      ok++;
    } catch (e) {
      failed.push('Row ' + row._rowNum + ': ' + e.message);
      writeBack(ctx, row._rowNum,
        { status: 'Failed', notes: String(e.message).slice(0, 400) });
    }
    if (i < products.length - 1) Utilities.sleep(CONFIG.THROTTLE_MS);
  }

  SpreadsheetApp.flush();

  ui.alert(
    'Done\n\n' +
    'Uploaded: ' + ok + '\n' +
    'Failed: ' + failed.length + '\n' +
    'Skipped: ' + skipped.length +
    (ranOutOfTime
      ? '\n\nStopped at the Apps Script time limit with ' +
        (products.length - ok - failed.length) + ' row(s) left. ' +
        'Everything done so far is saved — select the remaining rows and run again.'
      : '') +
    (failed.length ? '\n\nFailures:\n' + failed.join('\n') : '') +
    (skipped.length ? '\n\nSkipped:\n' + skipped.slice(0, 15).join('\n') : ''));
}

// ─────────────────────────────────────────────────────────────
// Sheet reading
// ─────────────────────────────────────────────────────────────

function buildContext() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bound = PropertiesService.getScriptProperties().getProperty('SHEET_NAME');
  var sheet = (bound && ss.getSheetByName(bound)) ||
              ss.getSheetByName(CONFIG.SHEET_NAME) ||
              ss.getActiveSheet();

  var width = sheet.getLastColumn();
  var headers = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, width).getValues()[0];

  var cols = {};
  headers.forEach(function (h, i) {
    var key = COLUMN_MAP[normalizeHeader(h)];
    if (key) cols[key] = i;
  });

  ['category', 'briefDescription', 'price'].forEach(function (required) {
    if (cols[required] === undefined) {
      throw new Error('Could not find the "' + required + '" column in row ' +
                      CONFIG.HEADER_ROW + ' of "' + sheet.getName() + '".');
    }
  });

  var domain = PropertiesService.getScriptProperties().getProperty('SHOP_DOMAIN');
  if (!domain) throw new Error('Run Bhoomija → Setup → Set Shopify credentials first.');

  return {
    sheet: sheet,
    width: width,
    cols: cols,
    shopDomain: domain,
    locationId: null,      // resolved lazily
    publicationId: null,   // resolved lazily
    folderCache: {}        // driveFolderId → { lowercaseFilename: fileId }
  };
}

function normalizeHeader(h) {
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
  var list = sheet.getActiveRangeList();
  var ranges = list ? list.getRanges() : [sheet.getActiveRange()];

  var seen = {}, out = [];
  ranges.forEach(function (r) {
    for (var i = 0; i < r.getNumRows(); i++) {
      var rowNum = r.getRow() + i;
      if (rowNum < CONFIG.FIRST_DATA_ROW || seen[rowNum]) continue;
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
  row._dimensions = buildDimensions(row);
  return row;
}

/**
 * The Drive link lives in the cell to the right of the image-names column and
 * carries no visible URL — the text reads "jpg" or a folder name. Pull the
 * real target from the cell's rich-text link, falling back to a HYPERLINK()
 * formula or a plain pasted URL.
 */
function readDriveLink(ctx, rowNum) {
  if (ctx.cols.imageNames === undefined) return '';
  var col = ctx.cols.imageNames + DRIVE_LINK_OFFSET + 1;   // 1-indexed
  if (col > ctx.width) return '';

  var cell = ctx.sheet.getRange(rowNum, col);

  try {
    var link = cell.getRichTextValue() && cell.getRichTextValue().getLinkUrl();
    if (link) return link;
  } catch (e) { /* cell has no rich text */ }

  var formula = cell.getFormula();
  var m = formula && formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
  if (m) return m[1];

  var text = String(cell.getValue() || '');
  return /^https?:\/\//i.test(text) ? text : '';
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

function buildDimensions(row) {
  var parts = ['length', 'width', 'height']
    .map(function (k) { return parseFloat(row[k]); })
    .filter(function (n) { return !isNaN(n) && n > 0; });
  return parts.length ? parts.join(' × ') + ' cm' : '';
}

/** Maps a sheet sub-category to the tag the smart collections match on. */
function resolveSubCategory(category, subCategory) {
  return SUBCATEGORY_ALIAS[category + '|' + subCategory] || subCategory;
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
  if (row.craft)        spec.push('<strong>Craft:</strong> '    + escapeHtml(row.craft));
  if (row.material)     spec.push('<strong>Material:</strong> ' + escapeHtml(row.material));
  if (row.region)       spec.push('<strong>Region:</strong> '   + escapeHtml(row.region));
  if (row.artisan && row.artisan !== row.region) {
    spec.push('<strong>Artisan / Cluster:</strong> ' + escapeHtml(row.artisan));
  }
  if (row._dimensions)  spec.push('<strong>Dimensions:</strong> ' + escapeHtml(row._dimensions));
  if (row.care)         spec.push('<strong>Care:</strong> '     + escapeHtml(row.care));
  if (spec.length) parts.push('<p>' + spec.join('<br>') + '</p>');

  return parts.join('\n');
}

function buildTags(row) {
  var tags = [];
  if (row.category)    tags.push(row.category);
  if (row.subCategory) tags.push(resolveSubCategory(row.category, row.subCategory));
  if (row.region)      tags.push(row.region);
  if (row.craft)       tags.push(row.craft);
  if (row.keywords) {
    row.keywords.split(/[,;|]/).forEach(function (t) {
      t = t.trim();
      if (t) tags.push(t);
    });
  }
  var seen = {}, out = [];
  tags.forEach(function (t) {
    var k = t.toLowerCase();
    if (!seen[k]) { seen[k] = true; out.push(t); }
  });
  return out;
}

/**
 * SKU from the sheet's own S. No. when it's a clean number, else the sheet row
 * number. Row numbers are stable and unique, so a broken serial can never
 * collide two products onto one SKU.
 */
/**
 * Reads the "Variant Values" cell, which prepare_product_images.py writes as
 * SLUG=Label pairs: "RED=Red|TAUPE=Taupe|MOSSGREEN=Moss Green".
 *
 * The slug is the suffix on the processed filenames (GHA-RUN-0001-RED_01.jpg),
 * so it is how an image finds its variant. The label is what shoppers see.
 */
function parseVariantValues(raw) {
  if (!raw) return [];
  return String(raw).split('|').map(function (pair) {
    var i = pair.indexOf('=');
    if (i === -1) return null;
    var slug = pair.slice(0, i).trim();
    var label = pair.slice(i + 1).trim();
    return (slug && label) ? { slug: slug, label: label } : null;
  }).filter(function (v) { return v; });
}

/** Which variant a processed filename belongs to: SKU-SLUG_01.jpg → SLUG. */
function variantSlugOf(filename, sku) {
  var base = String(filename).replace(/\.[^.]+$/, '');
  var m = base.match(/^(.*)_\d+$/);
  if (m) base = m[1];
  if (sku && base.indexOf(sku + '-') === 0) return base.slice(sku.length + 1);
  return null;
}

function buildSku(row) {
  if (row.sku) return row.sku;
  var serial = String(row.serial || '').trim();
  if (/^\d+(\.0+)?$/.test(serial)) return 'Bhoomija' + parseInt(serial, 10);
  return 'Bhoomija-R' + row._rowNum;
}

// ─────────────────────────────────────────────────────────────
// Drive images
// ─────────────────────────────────────────────────────────────

/**
 * Parses column AD into filenames. Entries often carry a trailing annotation
 * ("_ANC2177.JPG - Red"), and a few are notes with no filename at all
 * ("Strawberry motif") — those are reported rather than guessed at.
 *
 * RAW names (.CR3/.NEF/...) are kept here; whether they can actually be used
 * is decided later by prepareImageBlob, which re-renders them through Drive.
 */
function parseImageNames(raw) {
  if (!raw) return { files: [], unusable: [] };

  var files = [], unusable = [];
  var known = CONFIG.ACCEPTED_IMAGE_EXT.concat(CONFIG.RAW_IMAGE_EXT).join('|');
  var pattern = new RegExp('([^\\s,][^,]*?\\.(' + known + '))\\b', 'i');

  String(raw).split(/[,\n;]+/).forEach(function (entry) {
    entry = entry.trim();
    if (!entry) return;

    var m = entry.match(pattern);
    if (!m) { unusable.push(entry); return; }

    // RAW files are kept — prepareImageBlob re-renders them to JPEG.
    files.push(m[1].trim());
  });

  return { files: files, unusable: unusable };
}

function extractDriveFolderId(url) {
  if (!url) return null;
  var folder = url.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (folder) return { type: 'folder', id: folder[1] };
  var file = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  if (file) return { type: 'file', id: file[1] };
  var open = url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (open) return { type: 'file', id: open[1] };
  return null;
}

/**
 * Builds { lowercaseFilename → fileId } for a Drive folder, cached per run.
 * Thirty folders serve all 238 rows — one shared by 70 — so without this the
 * same folder would be listed dozens of times.
 */
function getFolderIndex(ctx, folderId) {
  if (ctx.folderCache[folderId]) return ctx.folderCache[folderId];

  var index = {};
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    index[f.getName().toLowerCase()] = f.getId();
  }

  ctx.folderCache[folderId] = index;
  return index;
}

/**
 * Resolves a row's filenames to Drive file IDs. Matches on the exact name
 * first, then ignoring extension, so a ".JPG" in the sheet still finds a
 * ".jpg" on Drive.
 */
function resolveDriveFiles(ctx, row) {
  // When prepare_product_images.py has been run, the row points at a folder
  // holding nothing but finished JPEGs named <SKU>_01.jpg, <SKU>_02.jpg...
  // There is nothing left to match or convert — take them all, in order.
  if (row.processedFolder) {
    var ready = { fileIds: [], matched: [], missing: [], unusable: [] };
    var t = extractDriveFolderId(row.processedFolder);
    if (!t || t.type !== 'folder') {
      ready.folderError = 'processed folder link not understood';
      return ready;
    }

    var idx;
    try { idx = getFolderIndex(ctx, t.id); }
    catch (e) {
      ready.folderError = 'processed folder unreadable: ' + e.message;
      return ready;
    }

    Object.keys(idx).filter(function (n) {
      return CONFIG.ACCEPTED_IMAGE_EXT.indexOf(String(n.split('.').pop())
                                               .toLowerCase()) !== -1;
    }).sort().forEach(function (n) {
      if (ready.fileIds.length >= CONFIG.MAX_IMAGES_PER_PRODUCT) return;
      ready.fileIds.push(idx[n]);
      ready.matched.push(n);
    });

    if (!ready.fileIds.length) ready.folderError = 'processed folder is empty';
    return ready;
  }

  var parsed = parseImageNames(row.imageNames);
  var result = { fileIds: [], matched: [], missing: [], unusable: parsed.unusable };

  if (!parsed.files.length) return result;

  var target = extractDriveFolderId(row._driveUrl);
  if (!target) {
    result.missing = parsed.files.slice();
    result.folderError = 'no Drive link';
    return result;
  }

  // A link straight to a single file — take it and skip name matching.
  if (target.type === 'file') {
    result.fileIds.push(target.id);
    result.matched.push('(direct link)');
    return result;
  }

  var index;
  try {
    index = getFolderIndex(ctx, target.id);
  } catch (e) {
    result.missing = parsed.files.slice();
    result.folderError = 'folder unreadable: ' + e.message;
    return result;
  }

  parsed.files.forEach(function (name) {
    if (result.fileIds.length >= CONFIG.MAX_IMAGES_PER_PRODUCT) return;

    var key = name.toLowerCase();
    var base = key.replace(/\.[^.]+$/, '');
    var id = null, used = name;

    // A JPEG sibling always wins over the RAW original, so dropping converted
    // files next to the .CR3s in Drive is enough — the sheet needs no edit.
    for (var c in index) {
      if (c.replace(/\.[^.]+$/, '') !== base) continue;
      var cext = String(c.split('.').pop()).toLowerCase();
      if (CONFIG.ACCEPTED_IMAGE_EXT.indexOf(cext) !== -1) { id = index[c]; used = c; break; }
    }

    if (!id && index[key]) { id = index[key]; used = name; }

    if (!id) {
      for (var c2 in index) {
        if (c2.replace(/\.[^.]+$/, '') === base) { id = index[c2]; used = c2; break; }
      }
    }

    if (id) { result.fileIds.push(id); result.matched.push(used); }
    else    { result.missing.push(name); }
  });

  return result;
}

/**
 * Asks Drive to re-render a file as a JPEG no larger than `longEdge` on its
 * longest side, and returns the bytes.
 *
 * This is the only image processing available to Apps Script — there is no
 * Sharp, no ImageMagick, no Canvas, and the one library people point at
 * (tanaikech/ImgApp) is a thin wrapper around this same endpoint. Drive does
 * the decode and the resize on its own servers, so it costs us one HTTP call
 * and no execution time.
 *
 * Returns null when Drive has no preview for the file — which is the answer
 * for Canon CR3 specifically. Callers must handle null.
 */
function driveRenderBlob(fileId, longEdge) {
  var url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) +
            '&sz=w' + (longEdge || CONFIG.RESIZE_LONG_EDGE);

  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      followRedirects: true,
      muteHttpExceptions: true
    });
  } catch (e) {
    return null;
  }

  if (res.getResponseCode() !== 200) return null;

  var blob = res.getBlob();
  if (String(blob.getContentType() || '').indexOf('image/') !== 0) return null;

  // Drive answers "no preview available" with a tiny generic icon rather than
  // an error, so anything under a couple of KB is not our photo.
  if (blob.getBytes().length < 2048) return null;

  return blob;
}

/** Reads width/height straight out of the file header. No decode, no library. */
function imageDimensions(bytes, ext) {
  function u8(i)  { return bytes[i] & 0xFF; }
  function be16(i) { return (u8(i) << 8) | u8(i + 1); }
  function be32(i) { return (u8(i) << 24) | (u8(i + 1) << 16) | (u8(i + 2) << 8) | u8(i + 3); }
  function le32(i) { return (u8(i + 3) << 24) | (u8(i + 2) << 16) | (u8(i + 1) << 8) | u8(i); }

  try {
    // PNG: IHDR is always the first chunk.
    if (bytes.length > 24 && u8(0) === 0x89 && u8(1) === 0x50) {
      return { w: be32(16), h: be32(20) };
    }

    // GIF: little-endian in the 6-byte header.
    if (bytes.length > 10 && u8(0) === 0x47 && u8(1) === 0x49 && u8(2) === 0x46) {
      return { w: u8(7) * 256 + u8(6), h: u8(9) * 256 + u8(8) };
    }

    // WEBP: VP8X carries the canvas size as two 24-bit minus-one values.
    if (bytes.length > 30 && u8(0) === 0x52 && u8(8) === 0x57 && u8(9) === 0x45) {
      if (u8(12) === 0x56 && u8(13) === 0x50 && u8(15) === 0x58) {
        var vw = (u8(26) << 16 | u8(25) << 8 | u8(24)) + 1;
        var vh = (u8(29) << 16 | u8(28) << 8 | u8(27)) + 1;
        return { w: vw, h: vh };
      }
      // VP8 lossy: 14-bit dimensions after the 3-byte start code.
      if (u8(12) === 0x56 && u8(13) === 0x50 && u8(15) === 0x20) {
        return { w: (u8(27) << 8 | u8(26)) & 0x3FFF, h: (u8(29) << 8 | u8(28)) & 0x3FFF };
      }
      // VP8L lossless: 14 bits each, minus one, packed little-endian.
      if (u8(12) === 0x56 && u8(13) === 0x50 && u8(15) === 0x4C) {
        var bits = le32(21);
        return { w: (bits & 0x3FFF) + 1, h: ((bits >> 14) & 0x3FFF) + 1 };
      }
      return null;
    }

    // JPEG: walk the segment chain to the start-of-frame marker.
    if (bytes.length > 4 && u8(0) === 0xFF && u8(1) === 0xD8) {
      var i = 2;
      while (i + 9 < bytes.length) {
        if (u8(i) !== 0xFF) { i++; continue; }
        var marker = u8(i + 1);
        if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
          i += 2; continue;
        }
        var len = be16(i + 2);
        // SOF0..SOF15, skipping the four that aren't frame headers.
        if (marker >= 0xC0 && marker <= 0xCF &&
            marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          return { h: be16(i + 5), w: be16(i + 7) };
        }
        if (len < 2) return null;
        i += 2 + len;
      }
    }
  } catch (e) { /* unreadable header — fall through */ }

  return null;
}

function toJpgName(name) {
  return String(name).replace(/\.[^.]+$/, '') + '.jpg';
}

/**
 * Returns bytes Shopify will actually accept, re-rendering through Drive when
 * the original is RAW, over 25 megapixels, or over 20 MB.
 *
 * Throws with a readable reason when nothing usable can be produced — that is
 * the CR3 case, and the row falls back to the placeholder rather than failing.
 */
function prepareImageBlob(fileId, declaredName) {
  var file = DriveApp.getFileById(fileId);
  var name = declaredName || file.getName();
  var ext  = String(name.split('.').pop() || '').toLowerCase();

  if (CONFIG.RAW_IMAGE_EXT.indexOf(ext) !== -1) {
    var converted = driveRenderBlob(fileId, CONFIG.RESIZE_LONG_EDGE);
    if (!converted) {
      throw new Error(ext.toUpperCase() + ' — Shopify rejects it and Drive has ' +
                      'no preview to convert from; needs a JPEG export');
    }
    return {
      blob: converted.setName(toJpgName(name)),
      name: toJpgName(name),
      note: ext.toUpperCase() + '\u2192JPEG'
    };
  }

  var blob = file.getBlob();
  var bytes = blob.getBytes();
  var dim = imageDimensions(bytes, ext);

  var overPixels = dim && (dim.w * dim.h) > CONFIG.MAX_PIXELS;
  var overBytes  = bytes.length > CONFIG.MAX_FILE_BYTES;
  if (!overPixels && !overBytes) return { blob: blob, name: name, note: '' };

  var why = overPixels
    ? (dim.w + '\u00d7' + dim.h + ', ' + (dim.w * dim.h / 1e6).toFixed(1) + ' MP')
    : (bytes.length / 1048576).toFixed(1) + ' MB';

  var resized = driveRenderBlob(fileId, CONFIG.RESIZE_LONG_EDGE);
  if (!resized) throw new Error('too large (' + why + ') and Drive returned no resized copy');

  return {
    blob: resized.setName(toJpgName(name)),
    name: toJpgName(name),
    note: 'resized from ' + why
  };
}

/**
 * Pushes a Drive file's bytes into Shopify and returns the resource URL to
 * hand to productCreateMedia. Staged upload keeps Drive private — nothing is
 * shared publicly.
 */
function stageDriveFile(fileId, declaredName) {
  var prepared = prepareImageBlob(fileId, declaredName);
  var blob = prepared.blob;
  var name = prepared.name;

  var staged = gql(
    'mutation($input: [StagedUploadInput!]!) {' +
    '  stagedUploadsCreate(input:$input) {' +
    '    stagedTargets { url resourceUrl parameters { name value } }' +
    '    userErrors { field message }' +
    '  } }',
    { input: [{
        resource: 'IMAGE',
        filename: name,
        mimeType: blob.getContentType(),
        httpMethod: 'POST',
        fileSize: String(blob.getBytes().length)
      }] });

  throwOnErrors(staged.stagedUploadsCreate.userErrors, 'stagedUploadsCreate');
  var target = staged.stagedUploadsCreate.stagedTargets[0];
  if (!target) throw new Error('no staged target returned');

  var form = {};
  target.parameters.forEach(function (p) { form[p.name] = p.value; });
  form.file = blob;

  var res = UrlFetchApp.fetch(target.url, {
    method: 'post',
    payload: form,
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('staged upload HTTP ' + code + ': ' +
                    res.getContentText().slice(0, 200));
  }

  return { resourceUrl: target.resourceUrl, name: name, note: prepared.note };
}

// ─────────────────────────────────────────────────────────────
// Shopify writes
// ─────────────────────────────────────────────────────────────

function createProduct(row, ctx) {
  var title = buildTitle(row);
  var notes = [];
  var sku = buildSku(row);
  var variantValues = parseVariantValues(row.variantValues);
  var optionName = String(row.variantOption || 'Colour').trim() || 'Colour';

  var productInput = {
    title: title,
    descriptionHtml: buildDescriptionHtml(row),
    vendor: row.region || 'Bhoomija',
    productType: row.subCategory || row.category,
    tags: buildTags(row),
    status: CONFIG.PRODUCT_STATUS
  };

  if (variantValues.length > 1) {
    productInput.productOptions = [{
      name: optionName,
      values: variantValues.map(function (v) { return { name: v.label }; })
    }];
  }

  // 1. Product shell
  var created = gql(
    'mutation($input: ProductInput!) {' +
    '  productCreate(input:$input) {' +
    '    product { id handle variants(first:1){nodes{id inventoryItem{id}}} }' +
    '    userErrors { field message }' +
    '  } }',
    { input: productInput });

  throwOnErrors(created.productCreate.userErrors, 'productCreate');
  var product = created.productCreate.product;
  var variant = product.variants.nodes[0];

  // 2. Price, SKU, weight
  var variantInput = {
    id: variant.id,
    price: String(parseFloat(row.price).toFixed(2)),
    inventoryItem: { tracked: true }
  };
  if (sku) variantInput.inventoryItem.sku = sku;
  if (row.mrp && !isNaN(parseFloat(row.mrp)) &&
      parseFloat(row.mrp) > parseFloat(row.price)) {
    variantInput.compareAtPrice = String(parseFloat(row.mrp).toFixed(2));
  }
  // Many rows hold "-" rather than a number; parseFloat weeds those out, and
  // the preview reports them so the gap is visible before upload.
  if (row.weight && !isNaN(parseFloat(row.weight))) {
    variantInput.inventoryItem.measurement = {
      weight: { value: parseFloat(row.weight), unit: 'GRAMS' }
    };
  } else {
    notes.push('no weight in sheet');
  }
  if (CONFIG.COUNTRY_OF_ORIGIN) {
    variantInput.inventoryItem.countryCodeOfOrigin = CONFIG.COUNTRY_OF_ORIGIN;
  }
  if (row.hsn && String(row.hsn).trim()) {
    variantInput.inventoryItem.harmonizedSystemCode = String(row.hsn).trim();
  }

  // 3. Images from Drive. Done before variants so each variant can be given
  // the media id of its own photo.
  var uploaded = [];
  try {
    var attached = attachImages(ctx, row, product.id, title);
    if (attached.note) notes.push(attached.note);
    uploaded = attached.media;
  } catch (e) {
    notes.push('image error: ' + e.message);
  }

  if (variantValues.length > 1) {
    notes.push(buildVariants(ctx, row, product, variantValues, optionName,
                             sku, variantInput, uploaded));
  } else {
    var variantUpdate = gql(
      'mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {' +
      '  productVariantsBulkUpdate(productId:$productId, variants:$variants) {' +
      '    productVariants { id sku }' +
      '    userErrors { field message }' +
      '  } }',
      { productId: product.id, variants: [variantInput] });
    throwOnErrors(variantUpdate.productVariantsBulkUpdate.userErrors,
                  'variant update');
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
    if (mf.metafieldsSet.userErrors.length) {
      notes.push('metafield warning: ' + mf.metafieldsSet.userErrors[0].message);
    }
  }

  // 5. Inventory. Variant products stocked each variant in buildVariants;
  // the standalone variant this refers to no longer exists there.
  var qty = parseInt(row.quantity, 10);
  if (variantValues.length <= 1 && !isNaN(qty) && qty > 0) {
    try {
      setInventory(ctx, variant.inventoryItem.id, qty);
    } catch (e) {
      notes.push('inventory warning: ' + e.message);
    }
  }

  // 6. Publish — without this the product is invisible whatever its status
  if (CONFIG.PUBLISH_TO_ONLINE_STORE) {
    try {
      publishToOnlineStore(ctx, product.id);
    } catch (e) {
      notes.push('publish warning: ' + e.message);
    }
  }

  return { id: product.id, handle: product.handle, sku: sku, notes: notes.join('; ') };
}

/**
 * Uploads a row's images and returns { note, media }, where media is
 * [{ name, id }] in upload order so a variant can be pointed at its own photo.
 */
function attachImages(ctx, row, productId, title) {
  var resolved = resolveDriveFiles(ctx, row);
  var notes = [];
  var sources = [];
  var created = [];

  var converted = 0, resizedCount = 0;

  // Names are collected alongside sources, never re-derived by index: a file
  // that fails to stage, or the placeholder below, shifts sources out of step
  // with resolved.matched, and a variant would then get another colour's photo.
  var sourceNames = [];

  resolved.fileIds.forEach(function (fileId, i) {
    try {
      var staged = stageDriveFile(fileId, resolved.matched[i]);
      if (staged.note.indexOf('JPEG') !== -1) converted++;
      else if (staged.note.indexOf('resized') !== -1) resizedCount++;
      sources.push({
        originalSource: staged.resourceUrl,
        alt: title,
        mediaContentType: 'IMAGE'
      });
      sourceNames.push(resolved.matched[i] || '');
    } catch (e) {
      notes.push('img ' + (resolved.matched[i] || fileId) + ' failed: ' + e.message);
    }
  });

  if (!sources.length && CONFIG.PLACEHOLDER_IMAGE_URL) {
    sources.push({
      originalSource: CONFIG.PLACEHOLDER_IMAGE_URL,
      alt: title,
      mediaContentType: 'IMAGE'
    });
    sourceNames.push('');
    notes.push('placeholder image');
  }

  if (sources.length) {
    var media = gql(
      'mutation($productId: ID!, $media: [CreateMediaInput!]!) {' +
      '  productCreateMedia(productId:$productId, media:$media) {' +
      '    media { id }' +
      '    mediaUserErrors { field message }' +
      '  } }',
      { productId: productId, media: sources });
    var errs = media.productCreateMedia.mediaUserErrors;
    if (errs.length) notes.push('media warning: ' + errs[0].message);

    // Media come back in the order submitted, which is the order of
    // resolved.matched, so filename and media id line up by index.
    (media.productCreateMedia.media || []).forEach(function (mm, i) {
      if (mm && mm.id) created.push({ name: sourceNames[i] || '', id: mm.id });
    });
  }

  if (sources.length && resolved.matched.length && !notes.length) {
    notes.push(sources.length + ' image' + (sources.length === 1 ? '' : 's'));
  }
  if (converted)    notes.push(converted + ' RAW converted');
  if (resizedCount) notes.push(resizedCount + ' resized');
  if (resolved.folderError) notes.push(resolved.folderError);
  if (resolved.missing.length) {
    notes.push('not found in Drive: ' + resolved.missing.join(', '));
  }
  if (resolved.unusable.length) {
    notes.push('skipped: ' + resolved.unusable.join(', '));
  }

  return { note: notes.join('; '), media: created };
}

/**
 * Turns one sheet row into a product with several variants.
 *
 * Each value gets its own SKU suffix (WEA-DUP-0021-PINKSHIBORI) and is pointed
 * at the media uploaded from its own photo, so choosing a colour on the
 * storefront swaps the image.
 *
 * Returns a short note for the sheet.
 */
function buildVariants(ctx, row, product, values, optionName, sku,
                       template, uploaded) {
  // First photo per slug wins — later ones stay as gallery images.
  var mediaBySlug = {};
  uploaded.forEach(function (m) {
    var slug = variantSlugOf(m.name, sku);
    if (slug && !mediaBySlug[slug]) mediaBySlug[slug] = m.id;
  });

  var qty = parseInt(row.quantity, 10);
  var withMedia = 0;

  var inputs = values.map(function (v) {
    var input = {
      optionValues: [{ optionName: optionName, name: v.label }],
      price: template.price,
      inventoryItem: { tracked: true }
    };
    if (sku) input.inventoryItem.sku = sku + '-' + v.slug;
    if (template.compareAtPrice) input.compareAtPrice = template.compareAtPrice;
    ['measurement', 'countryCodeOfOrigin', 'harmonizedSystemCode']
      .forEach(function (f) {
        if (template.inventoryItem && template.inventoryItem[f] !== undefined) {
          input.inventoryItem[f] = template.inventoryItem[f];
        }
      });
    if (mediaBySlug[v.slug]) {
      input.mediaId = mediaBySlug[v.slug];
      withMedia++;
    }
    return input;
  });

  var res = gql(
    'mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!,' +
    '         $strategy: ProductVariantsBulkCreateStrategy) {' +
    '  productVariantsBulkCreate(productId:$productId, variants:$variants,' +
    '                            strategy:$strategy) {' +
    '    productVariants { id sku inventoryItem { id } }' +
    '    userErrors { field message }' +
    '  } }',
    { productId: product.id, variants: inputs,
      strategy: 'REMOVE_STANDALONE_VARIANT' });

  throwOnErrors(res.productVariantsBulkCreate.userErrors, 'variant create');
  var made = res.productVariantsBulkCreate.productVariants || [];

  if (!isNaN(qty) && qty > 0) {
    made.forEach(function (v) {
      try { setInventory(ctx, v.inventoryItem.id, qty); } catch (e) { /* reported below */ }
    });
  }

  return made.length + ' ' + optionName.toLowerCase() + ' variants (' +
         withMedia + ' with own image)';
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

function publishToOnlineStore(ctx, productId) {
  if (!ctx.publicationId) {
    var pubs = gql('{ publications(first: 25) { nodes { id name } } }', {});
    var online = null;
    pubs.publications.nodes.forEach(function (p) {
      if (p.name === 'Online Store') online = p.id;
    });
    if (!online) throw new Error('Online Store channel not found');
    ctx.publicationId = online;
  }

  var res = gql(
    'mutation($id: ID!, $input: [PublicationInput!]!) {' +
    '  publishablePublish(id:$id, input:$input) { userErrors { field message } } }',
    { id: productId, input: [{ publicationId: ctx.publicationId }] });
  throwOnErrors(res.publishablePublish.userErrors, 'publish');
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
      cell.setValue('https://' + ctx.shopDomain + '/products/' + values[key]);
    } else {
      cell.setValue(values[key]);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Preview
// ─────────────────────────────────────────────────────────────

function previewText(products, skipped, ctx) {
  var lines = ['PREVIEW — nothing was sent to Shopify', ''];
  lines.push('Store: ' + ctx.shopDomain);
  lines.push('Status: ' + CONFIG.PRODUCT_STATUS +
             '   Publish to Online Store: ' + (CONFIG.PUBLISH_TO_ONLINE_STORE ? 'yes' : 'no'));
  lines.push('Ready: ' + products.length);
  lines.push('');

  products.slice(0, 5).forEach(function (r) {
    var resolved = resolveDriveFiles(ctx, r);
    lines.push('Row ' + r._rowNum + ' — ' + buildTitle(r));
    lines.push('   SKU ' + buildSku(r) +
               '   ₹' + r.price +
               '   qty ' + (r.quantity || '0'));
    lines.push('   Vendor: ' + (r.region || 'Bhoomija') +
               '   Type: ' + (r.subCategory || r.category));
    lines.push('   Tags: ' + buildTags(r).join(', '));
    if (r._dimensions) lines.push('   Dimensions: ' + r._dimensions);

    var img = [];
    if (resolved.matched.length) img.push(resolved.matched.length + ' found');
    if (resolved.missing.length) img.push(resolved.missing.length + ' MISSING');
    if (resolved.unusable.length) img.push(resolved.unusable.length + ' unusable');
    if (!img.length) img.push('none → placeholder');
    lines.push('   Images: ' + img.join(', '));
    if (resolved.folderError) lines.push('     ! ' + resolved.folderError);
    if (resolved.missing.length) lines.push('     missing: ' + resolved.missing.join(', '));
    if (resolved.unusable.length) lines.push('     unusable: ' + resolved.unusable.join(', '));
    lines.push('');
  });
  if (products.length > 5) lines.push('...and ' + (products.length - 5) + ' more');

  if (skipped.length) {
    lines.push('');
    lines.push('SKIPPED:');
    skipped.slice(0, 10).forEach(function (p) { lines.push('  ' + p); });
    if (skipped.length > 10) lines.push('  ...and ' + (skipped.length - 10) + ' more');
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Shopify transport
// ─────────────────────────────────────────────────────────────

/**
 * A legacy custom app has a static shpat_ token. A Dev Dashboard app instead
 * exchanges client ID + secret for a token Shopify expires after 24 hours, so
 * that one is cached and re-fetched a minute before it lapses.
 */
function getAccessToken() {
  var props = PropertiesService.getScriptProperties();

  var staticToken = props.getProperty('ADMIN_TOKEN');
  if (staticToken) return staticToken;

  var clientId = props.getProperty('CLIENT_ID');
  var clientSecret = props.getProperty('CLIENT_SECRET');
  var domain = props.getProperty('SHOP_DOMAIN');
  if (!clientId || !clientSecret) {
    throw new Error('Shopify credentials not set. Run Setup → Set Shopify credentials.');
  }

  var cached = props.getProperty('CACHED_TOKEN');
  var expiry = Number(props.getProperty('CACHED_TOKEN_EXPIRY') || 0);
  if (cached && Date.now() < expiry - 60000) return cached;

  var res = UrlFetchApp.fetch('https://' + domain + '/admin/oauth/access_token', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Token exchange failed (HTTP ' + res.getResponseCode() + '): ' +
                    res.getContentText().slice(0, 300));
  }

  var json = JSON.parse(res.getContentText());
  if (!json.access_token) {
    throw new Error('Token exchange returned no access_token: ' +
                    res.getContentText().slice(0, 300));
  }

  props.setProperties({
    CACHED_TOKEN: json.access_token,
    CACHED_TOKEN_EXPIRY: String(Date.now() + (json.expires_in || 86399) * 1000)
  });
  return json.access_token;
}

function gql(query, variables) {
  var props = PropertiesService.getScriptProperties();
  var domain = props.getProperty('SHOP_DOMAIN');
  if (!domain) throw new Error('Shopify credentials not set.');
  var token = getAccessToken();

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
    if (code !== 200) throw new Error('HTTP ' + code + ': ' + body.slice(0, 300));

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
