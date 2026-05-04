// BOM-aware file decoding. INTERLIS source files SHOULD be UTF-8, but real-world
// SIA405 / older CH-vendor exports often arrive as UTF-16 LE. file.text() always
// decodes as UTF-8, so we sniff the BOM first and pick the right encoding.
export async function readFileAsText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf.subarray(2));
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buf.subarray(2));
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buf.subarray(3));
  }
  return new TextDecoder('utf-8').decode(buf);
}
