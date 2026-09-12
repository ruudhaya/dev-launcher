/**
 * Fill `__TOKEN__`-style placeholders in a template. Pass token names without
 * the surrounding underscores; a token with no matching placeholder in the
 * template is simply unused, and a placeholder with no matching token is left
 * as-is (so partially-applied templates fail loudly and visibly, not silently).
 */
export function substitutePlaceholders(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  return Object.entries(tokens).reduce(
    (text, [token, value]) => text.replaceAll(`__${token}__`, value),
    template,
  );
}

const LS_UI_ELEMENT_PATTERN = /(<key>LSUIElement<\/key>\s*<)(?:true|false)(\/>)/;

/**
 * Set Info.plist's LSUIElement boolean by a targeted string replace, not the
 * generic `__TOKEN__` mechanism above — a plist boolean is its own tag
 * (`<true/>`/`<false/>`), so a bare placeholder there (`<__TOKEN__/>`) would
 * make the *template itself* invalid plist XML before substitution ever runs.
 * The runtime template ships with a real, valid `<true/>` as its default.
 */
export function setLsUiElementHeadless(infoPlist: string, headless: boolean): string {
  return infoPlist.replace(LS_UI_ELEMENT_PATTERN, `$1${headless ? 'true' : 'false'}$2`);
}
