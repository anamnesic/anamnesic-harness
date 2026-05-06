/**
 * Chronokairo email template — dark, minimal, monospace aesthetic.
 * Mirrors the CHRONOKAIRO · AGENT UI shown in the app.
 */

export interface EmailSection {
  label: string;
  /** List items with an optional code badge + body text */
  items?: Array<{ badge?: string; text: string }>;
  /** Free-form paragraphs (may contain inline <code> tags) */
  paragraphs?: string[];
}

export interface EmailTemplateParams {
  title: string;
  subtitle?: string;
  sections?: EmailSection[];
  /** Footer line — defaults to "Chronokairo :>" */
  footer?: string;
  /** ISO date string — defaults to now (UTC) */
  date?: string;
}

function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} · ${hh}:${min} UTC`;
}

function renderSection(section: EmailSection): string {
  const items = (section.items ?? [])
    .map(
      (item) => `
        <li style="margin-bottom:14px;padding-left:12px;border-left:2px solid #333;line-height:1.6;">
          ${
            item.badge
              ? `<code style="display:inline-block;background:#1a1a1a;border:1px solid #333;color:#e2e2e2;font-family:'Courier New',Courier,monospace;font-size:12px;padding:2px 7px;border-radius:4px;margin-right:8px;">${item.badge}</code>`
              : ''
          }<span style="color:#b0b0b0;">${item.text}</span>
        </li>`,
    )
    .join('');

  const paragraphs = (section.paragraphs ?? [])
    .map(
      (p) =>
        `<p style="color:#b0b0b0;line-height:1.75;margin:0 0 12px 0;font-size:14px;">${p}</p>`,
    )
    .join('');

  return `
    <div style="margin-bottom:36px;">
      <p style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.18em;color:#555;text-transform:uppercase;margin:0 0 16px 0;">${section.label}</p>
      ${items ? `<ul style="list-style:none;margin:0;padding:0;">${items}</ul>` : ''}
      ${paragraphs}
    </div>`;
}

/**
 * Returns a complete HTML email string in the Chronokairo dark style.
 *
 * @example
 * ```ts
 * const html = buildEmailHtml({
 *   title: 'TimeTravel Series',
 *   subtitle: 'Repositórios disponíveis e próximos passos',
 *   sections: [
 *     {
 *       label: 'Repositórios da Série',
 *       items: [
 *         { badge: 'chronokairo-dotcom/math-timetravel', text: '— mecânica de eras, matemática temporal' },
 *       ],
 *     },
 *   ],
 * });
 * ```
 */
export function buildEmailHtml(params: EmailTemplateParams): string {
  const { title, subtitle, sections = [], footer = 'Chronokairo :>', date } = params;

  const sectionsHtml = sections.map(renderSection).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d0d0d;-webkit-font-smoothing:antialiased;">

  <!-- outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#0d0d0d;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:620px;background-color:#111111;border:1px solid #222;border-radius:6px;overflow:hidden;">

          <!-- header bar -->
          <tr>
            <td style="padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.15em;color:#555;text-transform:uppercase;">
                    CHRONOKAIRO &nbsp;·&nbsp; AGENT
                  </td>
                  <td align="right" style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.08em;color:#444;">
                    ${formatDate(date)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background-color:#222;"></div>
            </td>
          </tr>

          <!-- title block -->
          <tr>
            <td style="padding:36px 32px 28px 32px;">
              <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;color:#f0f0f0;margin:0 0 8px 0;letter-spacing:-0.02em;">${title}</h1>
              ${subtitle ? `<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#666;margin:0;">${subtitle}</p>` : ''}
            </td>
          </tr>

          <!-- body sections -->
          <tr>
            <td style="padding:0 32px 12px 32px;">
              ${sectionsHtml}
            </td>
          </tr>

          <!-- divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background-color:#1e1e1e;"></div>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:20px 32px;">
              <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#444;margin:0;">${footer}</p>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>
  <!-- /outer wrapper -->

</body>
</html>`;
}
