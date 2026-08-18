/**
 * A real, scannable QR code for `https://onf.to`.
 *
 * The page shows a QR code as its main product illustration, so it had better
 * be a working one — a decorative lookalike on a page selling QR codes would be
 * exactly the kind of small lie that costs trust. This is a genuine Version 1,
 * error-correction level M symbol; scanning it opens this page.
 *
 * The matrix is baked in rather than encoded at runtime so the page ships no
 * QR library at all. Regenerate with:
 *
 *   python3 -c "import qrcode; q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0); \
 *     q.add_data('https://onf.to'); q.make(fit=True); \
 *     print(','.join(''.join('1' if c else '0' for c in r) for r in q.get_matrix()))"
 */

/** 21×21 module matrix, one string per row, '1' = dark module. */
const MATRIX = [
  '111111101111101111111',
  '100000101000101000001',
  '101110100100001011101',
  '101110101101101011101',
  '101110100111001011101',
  '100000100110001000001',
  '111111101010101111111',
  '000000001000100000000',
  '101101110011101001011',
  '010100010010011111111',
  '011001100110010001011',
  '111110001010000101010',
  '000111101011101011001',
  '000000001110110010000',
  '111111101001001010000',
  '100000101100010111101',
  '101110100010100010110',
  '101110101100101100010',
  '101110101010101100100',
  '100000100111111110001',
  '111111101101011011100',
]

/** The spec-mandated light margin. Without it many scanners simply give up. */
const QUIET_ZONE = 3
const SIZE = MATRIX.length + QUIET_ZONE * 2

export function QrMark({
  className,
  /** Colour of the dark modules. */
  color = '#171717',
  /**
   * The light plate behind the modules. Pass `'transparent'` when the mark is
   * being used decoratively at low opacity — a solid white plate over a dark
   * surface reads as a pale rectangle rather than a QR pattern. A real,
   * scannable rendering needs the opaque default.
   */
  plate = '#ffffff',
}: {
  className?: string
  color?: string
  plate?: string
}) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role="img"
      aria-label="QR code for onf.to"
      shapeRendering="crispEdges"
    >
      <rect width={SIZE} height={SIZE} fill={plate} />
      {MATRIX.map((row, y) =>
        row.split('').map((cell, x) =>
          cell === '1' ? (
            <rect
              key={`${x}-${y}`}
              x={x + QUIET_ZONE}
              y={y + QUIET_ZONE}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
