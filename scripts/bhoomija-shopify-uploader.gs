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

  // Shopify's media pipeline accepts these. RAW camera files (.CR3/.NEF) are
  // rejected, so they're skipped and reported rather than failing the row.
  ACCEPTED_IMAGE_EXT: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'],

  MAX_IMAGES_PER_PRODUCT: 10,

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
  'Wearables|Mekhela Chador':         'Mekhla Chador',
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
      .addItem('Check collection tag match', 'checkCollectionMatch'))
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
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getActiveSheet();

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
 */
function parseImageNames(raw) {
  if (!raw) return { files: [], unusable: [] };

  var files = [], unusable = [];
  String(raw).split(/[,\n;]+/).forEach(function (entry) {
    entry = entry.trim();
    if (!entry) return;

    var m = entry.match(/([^\s,][^,]*?\.(jpg|jpeg|png|webp|heic|gif|cr3|nef|arw|dng))\b/i);
    if (!m) { unusable.push(entry); return; }

    var name = m[1].trim();
    var ext = name.split('.').pop().toLowerCase();
    if (CONFIG.ACCEPTED_IMAGE_EXT.indexOf(ext) === -1) {
      unusable.push(name + ' (' + ext.toUpperCase() + ' not supported by Shopify)');
      return;
    }
    files.push(name);
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
    var id = index[key];

    if (!id) {
      var base = key.replace(/\.[^.]+$/, '');
      for (var candidate in index) {
        if (candidate.replace(/\.[^.]+$/, '') === base) { id = index[candidate]; break; }
      }
    }

    if (id) { result.fileIds.push(id); result.matched.push(name); }
    else    { result.missing.push(name); }
  });

  return result;
}

/**
 * Pushes a Drive file's bytes into Shopify and returns the resource URL to
 * hand to productCreateMedia. Staged upload keeps Drive private — nothing is
 * shared publicly.
 */
function stageDriveFile(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var name = file.getName();

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

  return { resourceUrl: target.resourceUrl, name: name };
}

// ─────────────────────────────────────────────────────────────
// Shopify writes
// ─────────────────────────────────────────────────────────────

function createProduct(row, ctx) {
  var title = buildTitle(row);
  var notes = [];

  // 1. Product shell
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

  // 2. Price, SKU, weight
  var sku = buildSku(row);
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

  // 3. Images from Drive
  try {
    var imageNote = attachImages(ctx, row, product.id, title);
    if (imageNote) notes.push(imageNote);
  } catch (e) {
    notes.push('image error: ' + e.message);
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

  // 5. Inventory
  var qty = parseInt(row.quantity, 10);
  if (!isNaN(qty) && qty > 0) {
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

/** Returns a short note describing what happened, or '' when all was clean. */
function attachImages(ctx, row, productId, title) {
  var resolved = resolveDriveFiles(ctx, row);
  var notes = [];
  var sources = [];

  resolved.fileIds.forEach(function (fileId, i) {
    try {
      var staged = stageDriveFile(fileId);
      sources.push({
        originalSource: staged.resourceUrl,
        alt: title,
        mediaContentType: 'IMAGE'
      });
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
    notes.push('placeholder image');
  }

  if (sources.length) {
    var media = gql(
      'mutation($productId: ID!, $media: [CreateMediaInput!]!) {' +
      '  productCreateMedia(productId:$productId, media:$media) {' +
      '    mediaUserErrors { field message }' +
      '  } }',
      { productId: productId, media: sources });
    var errs = media.productCreateMedia.mediaUserErrors;
    if (errs.length) notes.push('media warning: ' + errs[0].message);
  }

  if (resolved.matched.length && !notes.length) {
    notes.push(resolved.matched.length + ' image' +
               (resolved.matched.length === 1 ? '' : 's'));
  }
  if (resolved.folderError) notes.push(resolved.folderError);
  if (resolved.missing.length) {
    notes.push('not found in Drive: ' + resolved.missing.join(', '));
  }
  if (resolved.unusable.length) {
    notes.push('skipped: ' + resolved.unusable.join(', '));
  }

  return notes.join('; ');
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
