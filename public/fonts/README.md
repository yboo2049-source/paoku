# Local font sources

These are byte-for-byte original variable TrueType files from the official [google/fonts repository](https://github.com/google/fonts/tree/2fe1e8c6b137fb13041a7cfca6fdcd8a910ea4dc). No conversion, subsetting, glyph deletion or internal font renaming was performed. Hash suffixes identify the original bytes; they are only container filenames.

- Outfit: 110,884 bytes; normal weight axis 100–900; 360 mapped Unicode code points.
- Orbitron: 38,576 bytes; normal weight axis 400–900; 207 mapped Unicode code points.
- Total font bytes: 149,460. Complete cmap ranges, embedded names/version, original URL, SHA256, required weights and license/metadata identities are recorded in sources.json.

Each binary and its adjacent OFL.txt / METADATA.pb came from the same immutable revision. Embedded name/copyright and fvar/cmap tables were inspected and associated with the corresponding metadata/license. Outfit and Orbitron are SIL OFL 1.1; retain the supplied copyright and full license when distributing. Orbitron declares the reserved font name Orbitron. No modified font is shipped; future conversions/subsets must recheck OFL naming and distribution conditions. Fonts must not be sold by themselves, and authors must not be represented as endorsing modified versions.

Unicode coverage is preserved in full, including Latin/available extended characters. Characters absent from the original fonts (including Chinese) continue through the existing system sans-serif fallback. No system font files are bundled. No runtime Google API requests, preloads or remote license requests are required.

Updating requires a reviewed immutable revision, fresh binary/license/metadata hashes and names, changed content-addressed filename/URL, full font/visual/PWA checks and rollback verification. Existing CSS keeps font-display:swap and its fallback stacks. See the dedicated execution plan and remediation evidence for validation status; inclusion here does not imply offline precaching has passed.

The binary Orbitron axis is 400–900; CSS registers 500–900 to preserve the prior API's 500/700/900 matching (normal 400 styles select the nearest 500). Outfit registers its full 100–900 axis. The manifest distinguishes binary and CSS ranges. License/metadata text SHA checks normalize checkout CRLF back to upstream LF; binary hashes always use raw bytes.

License text preserves every word and notice, with upstream line-end spaces removed for repository whitespace checks. sources.json records both the upstream license SHA256 and the normalized distribution text SHA256. Font binary source/output hashes remain identical.
