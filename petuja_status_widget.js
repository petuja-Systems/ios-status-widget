// ================================================
// petuja Monitoring Widget (No configuration needed)
// ==================================================

const API_URL = "https://status.petuja.systems/api.php";

// -------------------------------------------------
// Data Types (Documentation Only)
// -------------------------------------------------
/**
 * @typedef {Object} Service
 * @property {string} name
 * @property {boolean} up
 * @property {number} uptime_1h
 */

/**
 * @typedef {Object} MonitoringData
 * @property {number} service_count
 * @property {Service[]} services
 * @property {string|number|Date} last_measurement_at
 */

// -------------------------------------------------
// UI / Theme Constants
// -------------------------------------------------

const COLORS = {
  background: new Color("#111827"),
  textMuted: new Color("#9CA3AF"),
  textSubtle: new Color("#6B7280"),
  textPrimary: Color.white(),
  ok: Color.green(),
  warn: Color.yellow(),
  bad: Color.red()
};

const LAYOUT = {
  padding: { top: 16, left: 16, bottom: 10, right: 16 },
  large: {
    colStatusWidth: 60,
    colUptimeWidth: 70,
    legendHeight: 18,
    rowHeight: 20,
    rowSpacing: 6
  }
};

// -------------------------------------------------
// Utility Functions — Data
// -------------------------------------------------

/**
 * Fetches the monitoring JSON from the API.
 * @returns {Promise<MonitoringData>}
 */
async function fetchStatus() {
  const request = new Request(API_URL);
  return await request.loadJSON();
}

/**
 * Returns the number of services currently online.
 * @param {Service[]} services
 */
function getOnlineCount(services) {
  return services.filter(s => s.up).length;
}

/**
 * Calculates the average 1h uptime across all services.
 * @param {Service[]} services
 * @returns {number} Rounded percentage
 */
function getAverageUptime(services) {
  if (!services.length) return 0;
  const total = services.reduce((acc, s) => acc + (s.uptime_1h || 0), 0);
  return Math.round(total / services.length);
}

/**
 * Formats a timestamp (HH:mm).
 * @param {string|number|Date} ts
 */
function formatLastUpdate(ts) {
  const date = new Date(ts);
  const df = new DateFormatter();
  df.dateFormat = "HH:mm";
  return df.string(date);
}

// -------------------------------------------------
// Utility Functions — UI / Layout
// -------------------------------------------------

/**
 * Creates a base widget with consistent padding and background.
 */
function createBaseWidget() {
  const w = new ListWidget();
  w.setPadding(
    LAYOUT.padding.top,
    LAYOUT.padding.left,
    LAYOUT.padding.bottom,
    LAYOUT.padding.right
  );
  w.backgroundColor = COLORS.background;
  return w;
}

/**
 * Adds the footer row containing the last update and branding.
 */
function addFooter(widget, lastUpdate) {
  widget.addSpacer();

  const row = widget.addStack();
  row.layoutHorizontally();

  const left = row.addText("Last update: " + formatLastUpdate(lastUpdate));
  left.font = Font.systemFont(9);
  left.textColor = COLORS.textSubtle;

  row.addSpacer();

  const right = row.addText("petuja.net");
  right.font = Font.systemFont(9);
  right.textColor = COLORS.textSubtle;
}

/**
 * Color for online count (small widget).
 */
function getOnlineStatusColor(online, total) {
  if (online <= total / 2) return COLORS.bad;
  if (online < total) return COLORS.warn;
  return COLORS.ok;
}

/**
 * Color based on uptime percentage.
 */
function getUptimeColor(uptime) {
  if (uptime >= 99) return COLORS.ok;
  if (uptime >= 95) return COLORS.warn;
  return COLORS.bad;
}

// -------------------------------------------------
// SMALL WIDGET — Centered summary
// -------------------------------------------------

/**
 * Builds the small widget showing online count.
 */
async function createSmallWidget(data) {
  const w = createBaseWidget();

  const total = data.service_count;
  const online = getOnlineCount(data.services);
  const color = getOnlineStatusColor(online, total);

  const center = w.addStack();
  center.layoutVertically();
  center.centerAlignContent();
  center.addSpacer();

  const big = center.addText(`${online} / ${total} UP`);
  big.font = Font.boldSystemFont(30);
  big.textColor = color;
  big.centerAlignText();

  center.addSpacer(4);

  const lbl = center.addText("Services online");
  lbl.font = Font.systemFont(11);
  lbl.textColor = COLORS.textMuted;
  lbl.centerAlignText();

  center.addSpacer();

  addFooter(w, data.last_measurement_at);

  return w;
}

// -------------------------------------------------
// MEDIUM WIDGET — Summary + Avg Uptime
// -------------------------------------------------

/**
 * Builds the medium widget containing summary + average uptime.
 */
async function createMediumWidget(data) {
  const w = createBaseWidget();

  const total = data.service_count;
  const online = getOnlineCount(data.services);
  const avgUptime = getAverageUptime(data.services);

  const header = w.addText("status.petuja.systems");
  header.font = Font.semiboldSystemFont(14);
  header.textColor = COLORS.textMuted;

  w.addSpacer(10);

  const row = w.addStack();
  row.layoutHorizontally();

  const onlineText = row.addText(`${online}/${total} online`);
  onlineText.font = Font.boldSystemFont(24);
  onlineText.textColor = online === total ? COLORS.ok : COLORS.warn;

  row.addSpacer();

  const uptimeStack = row.addStack();
  uptimeStack.layoutVertically();
  uptimeStack.centerAlignContent();

  const uptimeValue = uptimeStack.addText(`Ø ${avgUptime}%`);
  uptimeValue.font = Font.boldSystemFont(24);
  uptimeValue.textColor = getUptimeColor(avgUptime);

  const uptimeLabel = uptimeStack.addText("Avg Uptime (1h)");
  uptimeLabel.font = Font.systemFont(10);
  uptimeLabel.textColor = COLORS.textMuted;

  addFooter(w, data.last_measurement_at);

  return w;
}

// -------------------------------------------------
// LARGE WIDGET — Detailed Service List
// -------------------------------------------------

/**
 * Builds the large widget with full service table.
 */
async function createLargeWidget(data) {
  const w = createBaseWidget();

  // --- Centered title row ---
  const headerRow = w.addStack();
  headerRow.addSpacer();

  const title = headerRow.addText("status.petuja.systems – Details");
  title.font = Font.semiboldSystemFont(14);
  title.textColor = COLORS.textMuted;

  headerRow.addSpacer();
  w.addSpacer(8);

  const {
    colStatusWidth,
    colUptimeWidth,
    legendHeight,
    rowHeight,
    rowSpacing
  } = LAYOUT.large;

  // --- Table header / legend ---
  const legend = w.addStack();
  legend.layoutHorizontally();

  // Status column
  const stCol = legend.addStack();
  stCol.size = new Size(colStatusWidth, legendHeight);
  const statusLabel = stCol.addText("Status");
  statusLabel.font = Font.mediumSystemFont(10);
  statusLabel.textColor = COLORS.textMuted;

  // Service column
  const svcCol = legend.addStack();
  const serviceLabel = svcCol.addText("Service");
  serviceLabel.font = Font.mediumSystemFont(10);
  serviceLabel.textColor = COLORS.textMuted;

  legend.addSpacer();

  // Uptime column
  const upCol = legend.addStack();
  upCol.size = new Size(colUptimeWidth, legendHeight);
  const uptimeLabel = upCol.addText("Uptime (1h)");
  uptimeLabel.font = Font.mediumSystemFont(10);
  uptimeLabel.textColor = COLORS.textMuted;

  w.addSpacer(6);

  // --- Service rows ---
  for (const s of data.services) {
    const row = w.addStack();
    row.layoutHorizontally();

    // Status icon
    const statusCol = row.addStack();
    statusCol.size = new Size(colStatusWidth, rowHeight);
    const icon = statusCol.addText(s.up ? "🟢" : "🔴");
    icon.font = Font.systemFont(13);

    // Service name
    const svc = row.addStack();
    const name = svc.addText(s.name);
    name.font = Font.systemFont(14);
    name.textColor = COLORS.textPrimary;

    row.addSpacer();

    // Uptime value
    const uptimeCol = row.addStack();
    uptimeCol.size = new Size(colUptimeWidth, rowHeight);
    const uptimeText = uptimeCol.addText(`${s.uptime_1h}%`);
    uptimeText.font = Font.semiboldSystemFont(13);
    uptimeText.textColor = getUptimeColor(s.uptime_1h);

    w.addSpacer(rowSpacing);
  }

  addFooter(w, data.last_measurement_at);

  return w;
}

// -------------------------------------------------
// MAIN
// -------------------------------------------------

async function run() {
  const data = await fetchStatus();

  // Keep services sorted alphabetically for a stable UI
  data.services.sort((a, b) => a.name.localeCompare(b.name));

  let widget;

  switch (config.widgetFamily) {
    case "small":
      widget = await createSmallWidget(data);
      break;
    case "medium":
      widget = await createMediumWidget(data);
      break;
    case "large":
    default:
      widget = await createLargeWidget(data);
      break;
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    // Default preview when executed manually in the app
    await widget.presentMedium();
  }

  Script.complete();
}

await run();
