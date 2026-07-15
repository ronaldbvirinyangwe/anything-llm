const RuntimeSettings = require("../runtimeSettings");
const dns = require("dns").promises;
const net = require("net");

const VALID_PROTOCOLS = ["https:", "http:"];
const runtimeSettings = new RuntimeSettings();

function allowAnyIp() {
  const allowed = runtimeSettings.get("allowAnyIp");
  if (allowed && !runtimeSettings.get("seenAnyIpWarning")) {
    console.log(
      "\x1b[33mURL IP local address restrictions have been disabled by administrator!\x1b[0m"
    );
    runtimeSettings.set("seenAnyIpWarning", true);
  }
  return allowed;
}

function isPrivateIp(address) {
  if (!address || !net.isIP(address)) return true;

  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (net.isIPv4(mapped)) return isPrivateIp(mapped);
    const words = mapped.split(":");
    if (words.length === 2) {
      const high = Number.parseInt(words[0], 16);
      const low = Number.parseInt(words[1], 16);
      if (Number.isInteger(high) && Number.isInteger(low)) {
        return isPrivateIp(
          `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`
        );
      }
    }
    return true;
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

/**
 * If an ip address is passed in the user is attempting to collector some internal service running on internal/private IP.
 * This is not a security feature and simply just prevents the user from accidentally entering invalid IP addresses.
 * Can be bypassed via COLLECTOR_ALLOW_ANY_IP environment variable.
 * @param {URL} param0
 * @param {URL['hostname']} param0.hostname
 * @returns {boolean}
 */
function isInvalidIp({ hostname }) {
  if (allowAnyIp()) return false;
  const unwrapped = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  return net.isIP(unwrapped) ? isPrivateIp(unwrapped) : false;
}

async function assertSafeURL(url) {
  const destination = url instanceof URL ? url : new URL(url);
  if (!VALID_PROTOCOLS.includes(destination.protocol))
    throw new Error("Only HTTP(S) URLs are allowed.");
  if (destination.username || destination.password)
    throw new Error("URLs containing credentials are not allowed.");
  if (allowAnyIp()) return destination;

  const hostname = destination.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(hostname)
    ? [{ address: hostname }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address)))
    throw new Error("URL resolves to a private or reserved IP address.");
  return destination;
}

async function safeFetch(url, options = {}, maxRedirects = 5) {
  let destination = await assertSafeURL(url);
  for (let redirects = 0; redirects <= maxRedirects; redirects++) {
    const response = await fetch(destination, { ...options, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response has no location.");
    if (redirects === maxRedirects) throw new Error("Too many redirects.");
    destination = await assertSafeURL(new URL(location, destination));
  }
}

/**
 * Validates a URL strictly
 * - Checks the URL forms a valid URL
 * - Checks the URL is at least HTTP(S)
 * - Checks the URL is not an internal IP - can be bypassed via COLLECTOR_ALLOW_ANY_IP
 * @param {string} url
 * @returns {boolean}
 */
function validURL(url) {
  try {
    const destination = new URL(url);
    if (!VALID_PROTOCOLS.includes(destination.protocol)) return false;
    if (isInvalidIp(destination)) return false;
    return true;
  } catch {}
  return false;
}

/**
 * Modifies a URL to be valid:
 * - Checks the URL is at least HTTP(S) so that protocol exists
 * - Checks the URL forms a valid URL
 * @param {string} url
 * @returns {string}
 */
function validateURL(url) {
  try {
    let destination = url.trim();
    // If the URL has a protocol, just pass through
    // If the URL doesn't have a protocol, assume https://
    if (destination.includes("://"))
      destination = new URL(destination).toString();
    else destination = new URL(`https://${destination}`).toString();

    // If the URL ends with a slash, remove it
    return destination.endsWith("/") ? destination.slice(0, -1) : destination;
  } catch {
    if (typeof url !== "string") return "";
    return url.trim();
  }
}

/**
 * Validate if a link is a valid YouTube video URL
 * - Checks youtu.be, youtube.com, m.youtube.com, music.youtube.com
 * - Embed video URLs
 * - Short URLs
 * - Live URLs
 * - Regular watch URLs
 * - Optional query parameters (including ?v parameter)
 *
 * Can be used to extract the video ID from a YouTube video URL via the returnVideoId parameter.
 * @param {string} link - The link to validate
 * @param {boolean} returnVideoId - Whether to return the video ID if the link is a valid YouTube video URL
 * @returns {boolean|string} - Whether the link is a valid YouTube video URL or the video ID if returnVideoId is true
 */
function validYoutubeVideoUrl(link, returnVideoId = false) {
  try {
    if (!link || typeof link !== "string") return false;
    let urlToValidate = link;

    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      urlToValidate = "https://" + link;
      urlToValidate = new URL(urlToValidate).toString();
    }

    const regex =
      /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?(?:.*&)?v=|(?:live\/)?|shorts\/))([\w-]{11})(?:\S+)?$/;
    const match = urlToValidate.match(regex);
    if (returnVideoId) return match?.[1] ?? null;
    return !!match?.[1];
  } catch (error) {
    console.error("Error validating YouTube video URL", error);
    return returnVideoId ? null : false;
  }
}

module.exports = {
  validURL,
  validateURL,
  validYoutubeVideoUrl,
  isPrivateIp,
  assertSafeURL,
  safeFetch,
};
