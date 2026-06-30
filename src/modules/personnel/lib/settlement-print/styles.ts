/** Mutabakat/şube PDF belgesinin tüm CSS'i (statik). Sunum mantığı buradadır. */
export const DOC_STYLES = `
    * { box-sizing: border-box; }
    :root {
      --doc-ink: #0f172a;
      --doc-muted: #475569;
      --doc-border: #94a3b8;
      --doc-rule: #cbd5e1;
      --doc-paper: #ffffff;
      --doc-screen-bg: #f1f5f9;
    }
    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
    }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 12px max(14px, env(safe-area-inset-right)) 28px max(14px, env(safe-area-inset-left));
      color: var(--doc-ink);
      font-size: 11px;
      line-height: 1.45;
      background: var(--doc-screen-bg);
      -webkit-font-smoothing: antialiased;
    }
    .settlement-doc {
      max-width: 210mm;
      margin: 0 auto;
      background: var(--doc-paper);
      padding: max(16px, env(safe-area-inset-left)) max(18px, env(safe-area-inset-right)) 20px max(18px, env(safe-area-inset-left));
      border: 1px solid var(--doc-rule);
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    @media screen and (min-width: 900px) {
      .settlement-doc { padding: 22px 26px 26px; }
    }
    .settlement-toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      margin: -12px calc(-1 * max(14px, env(safe-area-inset-left))) 16px calc(-1 * max(14px, env(safe-area-inset-left)));
      padding: 12px max(14px, env(safe-area-inset-left)) 12px max(14px, env(safe-area-inset-left));
      padding-top: max(12px, env(safe-area-inset-top));
      background: rgba(255,255,255,0.96);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--doc-rule);
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
    }
    .settlement-toolbar-inner { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .settlement-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 0 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .settlement-btn-primary { background: var(--doc-ink); color: #fff; }
    .settlement-btn-primary:hover { background: #1e293b; }
    .settlement-btn-secondary { background: #fff; color: var(--doc-ink); border: 1px solid var(--doc-border); }
    .settlement-btn-secondary:hover { background: #f8fafc; }
    .settlement-toolbar-hint { margin: 10px 0 0; font-size: 11px; line-height: 1.45; color: var(--doc-muted); max-width: 42rem; }
    .report-header {
      position: relative;
      margin: 0 0 14px;
      padding: 12px 15px 11px;
      border: 1px solid var(--doc-border);
      border-top: 2px solid var(--doc-ink);
      border-radius: 8px;
      background: var(--doc-paper);
      overflow: hidden;
      break-inside: avoid;
    }
    .report-header-inner {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 16px;
      justify-content: space-between;
    }
    .report-header-main { position: relative; flex: 1; min-width: min(100%, 11rem); }
    .report-header-aside {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      text-align: right;
    }
    .report-gen {
      font-size: 9.5px;
      color: var(--doc-muted);
      white-space: nowrap;
    }
    .report-gen-k { font-weight: 700; color: var(--doc-ink); }
    .report-header-photo-wrap { flex-shrink: 0; }
    .report-header-photo {
      display: block;
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 2px;
      border: 1px solid var(--doc-border);
      background: #f8fafc;
    }
    .report-hero-badge {
      display: inline-flex;
      align-items: center;
      margin-bottom: 6px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--doc-muted);
      background: #f1f5f9;
      border: 1px solid var(--doc-rule);
    }
    .report-title {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: clamp(1.05rem, 4vw, 1.3rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--doc-ink);
      margin: 0 0 2px;
      line-height: 1.15;
    }
    .report-tagline {
      font-size: 10.5px;
      line-height: 1.4;
      color: var(--doc-muted);
      margin: 0 0 8px;
      max-width: 42rem;
    }
    .report-meta {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px 7px;
      font-size: 10px;
      color: var(--doc-muted);
    }
    .report-meta li {
      display: inline-flex;
      gap: 5px;
      align-items: baseline;
      padding: 2px 8px;
      background: #f8fafc;
      border-radius: 999px;
      border: 1px solid var(--doc-rule);
    }
    .report-meta .mk { font-weight: 700; color: var(--doc-ink); white-space: nowrap; }
    h2 {
      --sec: var(--doc-ink);
      --sec-tint: #f1f5f9;
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 13px;
      font-weight: 700;
      margin: 20px 0 8px;
      border-bottom: 2px solid var(--sec);
      border-left: 4px solid var(--sec);
      border-radius: 3px 3px 0 0;
      padding: 5px 8px 5px 9px;
      color: var(--doc-ink);
      background: var(--sec-tint);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Bölüm-başı semantik aksanlar — disiplinli palet (anlam başına tek hue, tekrar kullanılır). */
    h2.sec-stock  { --sec: #b45309; --sec-tint: #fff7ed; } /* amber — mal/stok */
    h2.sec-adv    { --sec: #7c3aed; --sec-tint: #f5f3ff; } /* violet — personel ekseni */
    h2.sec-exp    { --sec: #be123c; --sec-tint: #fff1f2; } /* rose — gider */
    h2.sec-reg    { --sec: #0f766e; --sec-tint: #f0fdfa; } /* teal — kasa */
    h2.sec-salary { --sec: #7c3aed; --sec-tint: #f5f3ff; } /* violet — personel ekseni */
    h2.sec-tot    { --sec: #0f766e; --sec-tint: #f0fdfa; } /* teal — toplam (kahraman) */
    h2.sec-notes  { --sec: #475569; --sec-tint: #f8fafc; } /* slate — nötr */
    .meta { color: var(--doc-muted); margin-bottom: 12px; font-size: 11px; line-height: 1.45; }
    .meta-compact { font-size: 9.5px; line-height: 1.35; margin: 0 0 6px; }
    table {
      width: 100%;
      min-width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      font-size: 10px;
    }
    th, td { border: 1px solid var(--doc-border); padding: 6px 6px; vertical-align: top; word-wrap: break-word; }
    th { background: #e2e8f0; text-align: left; font-weight: 700; color: var(--doc-ink); }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr { break-inside: avoid; }
    /* Personel gider/avans tablosu — tür rozeti ve alt toplam çubuğu */
    .otype { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; color: #fff; white-space: nowrap; }
    .otype-adv { background: #7c3aed; } /* avans — violet */
    .otype-exp { background: #be123c; } /* gider — rose */
    .src-br { color: #64748b; font-weight: 600; } /* kaynak kasa ise şube adı */
    .outflow-foot { display: flex; flex-wrap: wrap; gap: 4px 14px; justify-content: flex-end; margin: 4px 0 2px; font-size: 10px; }
    .outflow-foot .of-k { color: var(--doc-muted, #64748b); font-weight: 600; }
    .outflow-foot .of-v { font-weight: 800; font-variant-numeric: tabular-nums; }
    .outflow-foot .of-total .of-v { color: #be123c; }
    thead { display: table-header-group; }
    @media screen and (max-width: 640px) {
      table { font-size: 9px; }
      th, td { padding: 5px 4px; }
    }
    h3.reg-sub {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--doc-muted);
      margin: 14px 0 8px 8px;
      padding-left: 9px;
      border-left: 3px solid var(--doc-border);
    }
    h3.reg-sub.in  { color: #0f766e; border-left-color: #0f766e; }
    h3.reg-sub.out { color: #be123c; border-left-color: #be123c; }
    .dist-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0 0 10px;
      break-inside: avoid;
    }
    .dist-cap {
      display: inline-flex;
      align-items: center;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--doc-muted);
      margin-right: 2px;
    }
    .dist-cap::after { content: ":"; }
    .dist-chip {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      padding: 5px 9px 5px 8px;
      background: #f8fafc;
      border: 1px solid var(--doc-rule);
      border-left: 3px solid var(--doc-border);
      border-radius: 6px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .dist-chip-strong { background: #f1f5f9; border-color: var(--doc-border); }
    .dist-chip-k {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--doc-muted);
    }
    .dist-chip-v { font-size: 11px; font-weight: 800; color: var(--doc-ink); font-variant-numeric: tabular-nums; }
    .reg-table td.reg-strong { font-weight: 800; }
    .reg-badge {
      display: inline-block;
      padding: 1px 6px;
      margin-left: 4px;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 999px;
      white-space: nowrap;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .reg-badge-transfer { color: #64748b; background: #f1f5f9; border-color: #cbd5e1; }
    .reg-cp { color: var(--doc-muted); font-weight: 600; white-space: nowrap; }
    .settlement-notes-wrap { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
    .settlement-note-card {
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      border-radius: 2px;
      padding: 10px 12px;
      break-inside: avoid;
    }
    .settlement-note-meta { font-size: 10px; color: var(--doc-muted); margin-bottom: 6px; }
    .settlement-note-body { font-size: 11px; color: var(--doc-ink); white-space: pre-wrap; line-height: 1.45; }
    .footer-note {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid var(--doc-border);
      color: var(--doc-muted);
      font-size: 10px;
      line-height: 1.5;
    }
    .salary-cost-section { margin-bottom: 8px; break-inside: avoid; }
    .salary-cost-disclaimer {
      border: 1px solid #ca8a04;
      border-left: 3px solid #ca8a04;
      background: #fffbeb;
      border-radius: 6px;
      padding: 6px 10px;
      margin: 0 0 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .salary-cost-disclaimer-title { font-weight: 800; font-size: 9.5px; letter-spacing: 0.02em; text-transform: uppercase; color: #854d0e; margin-bottom: 2px; }
    .salary-cost-disclaimer-body { margin: 0; font-size: 9px; line-height: 1.35; color: #713f12; }
    .season-tenure-callout {
      border: 1px solid var(--doc-border);
      background: #f8fafc;
      border-left: 3px solid var(--doc-ink);
      border-radius: 2px;
      padding: 12px 14px;
      margin: 0 0 16px;
      break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .season-tenure-title { font-weight: 800; font-size: 11px; color: var(--doc-ink); margin-bottom: 8px; }
    .season-tenure-body { margin: 0 0 8px; font-size: 11px; line-height: 1.45; color: var(--doc-ink); }
    .season-tenure-salary { margin: 0 0 4px; font-size: 11px; line-height: 1.45; color: var(--doc-ink); }
    .season-tenure-salary .mk { font-weight: 700; color: var(--doc-ink); margin-right: 6px; }
    .season-tenure-basis { margin: 0 0 8px; font-size: 10px; line-height: 1.4; color: var(--doc-muted); }
    .season-tenure-disclaimer { margin: 0; font-size: 10px; line-height: 1.45; color: var(--doc-muted); }
    .salary-cost-meta { margin-top: 0; }
    .salary-cost-table { margin-top: 8px; }
    .salary-cost-total-row td { font-weight: 800; background: #f1f5f9; }
    .salary-cost-highlight-row td { font-weight: 600; background: #fef9c3; }
    .settlement-totals-wrap { display: block; margin-bottom: 8px; max-width: 100%; }
    .src-section { margin-top: 6px; }
    .src-subhead {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--doc-muted);
      margin: 12px 0 8px;
    }
    .src-subhead-note { font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--doc-muted); }
    .src-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 10px; }
    .src-card {
      flex: 1 1 200px;
      min-width: 180px;
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      border-top: 3px solid var(--doc-border);
      border-radius: 8px;
      padding: 9px 11px 8px;
      break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .src-card-head {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .src-line {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 10px;
      padding: 4px 0;
      border-bottom: 1px solid var(--doc-rule);
    }
    .src-line:last-child { border-bottom: 0; }
    .src-k { color: var(--doc-muted); font-weight: 600; }
    .src-v { font-weight: 700; color: var(--doc-ink); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
    .src-line-total {
      border-bottom: 0;
      border-top: 1.5px solid var(--doc-border);
      margin-top: 2px;
      padding-top: 5px;
    }
    .src-line-total .src-k, .src-line-total .src-v { font-weight: 800; color: var(--doc-ink); }
    .src-total-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin: 2px 0 10px;
      padding: 8px 13px;
      background: #f1f5f9;
      border: 1px solid var(--doc-rule);
      border-left: 4px solid var(--doc-border);
      border-radius: 8px;
      break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .src-total-k { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--doc-muted); }
    .src-total-v { font-size: 13px; font-weight: 800; color: var(--doc-ink); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
    .empty-note {
      display: inline-block;
      margin: 0 0 10px;
      padding: 5px 12px;
      font-size: 10px;
      color: var(--doc-muted);
      background: #f8fafc;
      border: 1px dashed var(--doc-rule);
      border-radius: 8px;
    }
    /* Şubenin nakiti nerede — belirgin (story finali) blok. */
    .cash-where-card {
      margin: 2px 0 10px;
      border: 1px solid #99f6e4;
      border-top: 3px solid #0f766e;
      border-radius: 10px;
      overflow: hidden;
      background: #f0fdfa;
      break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cash-where-head {
      padding: 8px 13px 7px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #0f766e;
      border-bottom: 1px solid #99f6e4;
    }
    .cash-where-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      border: 0;
      background: var(--doc-paper);
      font-size: 11px;
    }
    .cash-where-table th, .cash-where-table td {
      border: 0;
      border-bottom: 1px solid var(--doc-rule);
      padding: 6px 13px;
      vertical-align: middle;
    }
    .cash-where-table th {
      background: var(--doc-paper);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--doc-muted);
    }
    .cash-where-table td.cw-label { font-weight: 700; border-left: 3px solid var(--doc-border); }
    .cash-where-table td.num, .cash-where-table th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 700; }
    .cash-where-table td.cw-rem { font-weight: 800; color: #0f766e; }
    .cash-where-table tr.cw-total td {
      border-bottom: 0;
      border-top: 2px solid #0f766e;
      background: #f0fdfa;
      font-weight: 800;
      color: #0f766e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .settlement-totals-empty { margin-top: 0; }
    .settlement-totals-currency {
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      border-radius: 2px;
      overflow: hidden;
      break-inside: avoid;
      margin-bottom: 12px;
    }
    .settlement-totals-currency:last-child { margin-bottom: 0; }
    .settlement-totals-ccy {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--doc-ink);
      padding: 8px 12px 7px;
      background: #e2e8f0;
      border-bottom: 1px solid var(--doc-border);
    }
    .settlement-totals-lines { padding: 2px 0; }
    .settlement-totals-line {
      display: table;
      width: 100%;
      table-layout: fixed;
      padding: 7px 12px;
      border-bottom: 1px solid var(--doc-rule);
      font-size: 11px;
    }
    .settlement-totals-k {
      display: table-cell;
      width: 62%;
      vertical-align: baseline;
      color: var(--doc-muted);
      font-weight: 600;
      padding-right: 10px;
      line-height: 1.35;
    }
    .settlement-totals-v {
      display: table-cell;
      vertical-align: baseline;
      text-align: right;
      white-space: nowrap;
      color: var(--doc-ink);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .settlement-totals-grand {
      display: table;
      width: 100%;
      table-layout: fixed;
      padding: 11px 12px 12px;
      background: #f0fdfa;
      border-top: 2px solid #0f766e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .settlement-totals-grand-k {
      display: table-cell;
      vertical-align: middle;
      width: 38%;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #0f766e;
      padding-right: 10px;
    }
    .settlement-totals-grand-v {
      display: table-cell;
      vertical-align: middle;
      text-align: right;
      font-size: clamp(16px, 4.6vw, 19px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f766e;
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }
    /* Özet kâr-zarar (P&L) kartı — kompakt, bölümlü, anlaşılır. */
    .pnl-group {
      padding: 7px 12px 8px;
      border-bottom: 1px solid var(--doc-rule);
    }
    .pnl-group:last-child { border-bottom: 0; }
    .pnl-head {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--doc-muted);
      margin-bottom: 4px;
    }
    .pnl-line {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      padding: 3px 0;
    }
    .pnl-k { color: var(--doc-muted); }
    .pnl-v { font-weight: 700; color: var(--doc-ink); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
    .pnl-line-sub { padding: 1px 0 1px 14px; font-size: 10px; }
    .pnl-line-sub .pnl-k { color: var(--doc-muted); }
    .pnl-line-sub .pnl-k::before { content: "↳ "; color: var(--doc-border); }
    .pnl-line-sub .pnl-v { font-weight: 600; color: var(--doc-muted); }
    .pnl-line-strong { border-top: 1px solid var(--doc-rule); margin-top: 2px; padding-top: 4px; }
    .pnl-line-strong .pnl-k, .pnl-line-strong .pnl-v { font-weight: 800; color: var(--doc-ink); }
    .pnl-line-total { border-top: 1px solid var(--doc-border); margin-top: 2px; padding-top: 4px; }
    .pnl-line-total .pnl-k, .pnl-line-total .pnl-v { font-weight: 800; }
    .pnl-line-held .pnl-k { color: #7c3aed; font-weight: 700; }
    .pnl-line-held .pnl-v { color: #7c3aed; }
    .pnl-profit {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 9px 12px 10px;
      background: #f0fdfa;
      border-top: 2px solid #0f766e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pnl-profit-neg { background: #fff1f2; border-top-color: #be123c; }
    .pnl-profit-k { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: #0f766e; }
    .pnl-profit-neg .pnl-profit-k { color: #be123c; }
    .pnl-profit-v { font-size: clamp(15px, 4.4vw, 18px); font-weight: 800; color: #0f766e; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
    .pnl-profit-neg .pnl-profit-v { color: #be123c; }
    @media screen and (max-width: 540px) {
      .report-header-inner { flex-direction: column; align-items: stretch; }
      .report-header-photo-wrap { order: -1; align-self: center; margin-bottom: 4px; }
      .report-header-photo { width: 104px; height: 104px; }
      .report-title { text-align: center; }
      .report-tagline { text-align: center; margin-left: auto; margin-right: auto; }
      .report-hero-badge { align-self: center; }
      .report-meta { align-items: stretch; }
      .report-meta li { width: 100%; }
    }
    @media screen and (max-width: 420px) {
      .settlement-totals-grand { display: block; padding: 10px 12px 12px; }
      .settlement-totals-grand-k { display: block; width: 100%; margin-bottom: 6px; }
      .settlement-totals-grand-v { display: block; width: 100%; text-align: right; }
    }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .no-print { display: none !important; }
      .settlement-toolbar { display: none !important; }
      .settlement-doc {
        max-width: none;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
        overflow: visible;
      }
      .report-header {
        border: 1px solid #000;
        border-top: 3px solid #000;
        box-shadow: none;
        background: #fff;
      }
      .report-meta li { background: #fff; border-color: #94a3b8; }
      .report-hero-badge { background: #f1f5f9; border-color: #94a3b8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .season-tenure-callout { background: #f8fafc; border-color: #64748b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { box-shadow: none; }
      .settlement-totals-currency { box-shadow: none; }
      th { background: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h2 { break-after: avoid; }
      .report-header-photo { break-inside: avoid; }
    }
`;
