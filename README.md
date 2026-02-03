# Html Display

PCF control that displays HTML from a bound field in a sandboxed container (Power Apps / Dynamics 365).

## Features

- Sandboxed rendering (closed Shadow DOM)
- **XSS-safe HTML via DOMPurify** with a configurable whitelist of allowed tags and attributes
- Configurable horizontal overflow
- Optional clear-after-load so HTML is not persisted

## Configuration

| Property | Type | Description |
|----------|------|-------------|
| **Message** | Bound (Multiple) | HTML content. Bound to a multiline text field. |
| **Overflow** | Input (SingleLine.Text) | Horizontal overflow: `auto`, `scroll`, `hidden`, `visible`, `clip`. Default: `auto`. |
| **Clear message after load** | Input (TwoOptions) | If **Yes**, the bound field is set to null after display so no HTML is saved. Default: **No**. |
| **Allowed HTML tags** | Input (SingleLine.Text) | Comma-separated list of allowed HTML tags. Default: `p,br,b,i,u,strong,em,a,ul,ol,li,table,thead,tbody,tr,th,td`. Add `style` only if you need `<style>...</style>` and accept the **security risk** (see Security). Empty = no tags (all HTML stripped). |
| **Allowed attributes** | Input (SingleLine.Text) | Comma-separated list of allowed attributes (e.g. `href` for links). Default: `href`. Empty = no attributes. |

## Security

- **DOMPurify whitelist** – All HTML is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) before rendering. Only tags and attributes listed in **Allowed HTML tags** and **Allowed attributes** are kept; scripts, event handlers (e.g. `onerror`, `onclick`), and unsafe markup are removed. This prevents **Stored XSS** even if the Message field is editable by users, imports, or integrations.
- **Configurable whitelist** – Restrict the allowed tags/attributes in the component settings to the minimum your use case needs. Fewer tags = smaller attack surface.
- **Shadow DOM** – Closed Shadow Root; host page cannot access or style the rendered HTML.
- **Bound field** – The Message field is bound to CRM data. Sanitization happens inside the control; you can still limit who can write to the bound field via security roles to reduce risk further.

### Whitelist configuration (important)

- **Only trusted configuration** – Allowed tags and attributes are set when the form is configured (app maker/admin). Do not allow end users or untrusted systems to change these settings.
- **Do not allow event handlers or inline style** – Do **not** add event attributes (e.g. `onclick`, `onerror`, `onload`) or the `style` *attribute* to **Allowed attributes** (that would allow `style="..."` on elements and can reintroduce XSS). Use the default `href` only, or add attributes like `target` if you need them (see below).
- **`<style>` tag is a significant security risk** – Allowing the **`style`** tag in **Allowed HTML tags** enables embedded CSS (`<style>...</style>`). CSS can be abused for XSS, data exfiltration, or UI manipulation (e.g. `expression()` in older browsers, `-moz-binding`, `behavior`, `@import` to external resources, or `url()` to leak data). **Only add `style` to the whitelist if the Message field content is fully trusted** (e.g. authored only by admins, not by end users or imports). If you do allow it, the component uses DOMPurify’s `FORCE_BODY` so that leading `<style>` tags are not stripped; DOMPurify does not sanitize CSS inside `<style>`, so the risk remains with the content provider.
- **Links with `target="_blank"`** – If you add `target` to **Allowed attributes** so that links open in a new tab, be aware of [tab-nabbing](https://owasp.org/www-community/attacks/Reverse_Tabnabbing). Prefer links that use `rel="noopener"` (and optionally `rel="noreferrer"`) in the stored HTML where possible; DOMPurify does not add these automatically.

### Dependency updates

- Keep **DOMPurify** updated to the latest patch version (e.g. `npm update dompurify`) and run `npm audit` regularly so security fixes are applied in time.

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) in the project root. In short: use, modify, and distribute are permitted; warranty and liability are disclaimed.
