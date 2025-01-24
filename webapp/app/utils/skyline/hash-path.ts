const LOCKED_HUE_RANGE_HASH = 10
const LOCKED_SATURATION_RANGE_HASH = 3
const LOCKED_LIGHTNESS_RANGE_HASH = 3
const LOCKED_HUE_RANGE_DEPTH = 12
const LOCKED_SATURATION_RANGE_DEPTH = 6
const LOCKED_LIGHTNESS_RANGE_DEPTH = 4

function hashSegment(segment: string): number {
  let hash = 0
  for (let i = 0; i < segment.length; i++) {
    const char = segment.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function generateColor(
  path: string,
  {
    hue: hueOffset = 0,
    saturation: saturationOffset = 0,
    lightness: lightnessOffset = 0,
  }: {
    hue?: number
    saturation?: number
    lightness?: number
  },
): string {
  const segments = path.split("/")
  const baseHue = hashSegment(segments[0]) % 360
  const depth = segments.length - 1

  const lastSegmentHash = hashSegment(segments[segments.length - 1])

  const hueVarianceHash =
    (lastSegmentHash % (LOCKED_HUE_RANGE_HASH * 2 + 1)) - LOCKED_HUE_RANGE_HASH
  const hueVarianceDepth = depth * LOCKED_HUE_RANGE_DEPTH
  const finalHue =
    (baseHue + hueVarianceHash + hueVarianceDepth + hueOffset + 360) % 360

  const saturationBase = 70
  const saturationVarianceHash =
    (lastSegmentHash % (LOCKED_SATURATION_RANGE_HASH * 2 + 1)) -
    LOCKED_SATURATION_RANGE_HASH
  const saturationVarianceDepth = depth * LOCKED_SATURATION_RANGE_DEPTH
  const saturation = Math.max(
    0,
    Math.min(
      100,
      saturationBase +
        saturationVarianceHash -
        saturationVarianceDepth +
        saturationOffset,
    ),
  )

  const lightnessBase = 60
  const lightnessVarianceHash =
    (lastSegmentHash % (LOCKED_LIGHTNESS_RANGE_HASH * 2 + 1)) -
    LOCKED_LIGHTNESS_RANGE_HASH
  const lightnessVarianceDepth = depth * LOCKED_LIGHTNESS_RANGE_DEPTH
  const lightness = Math.max(
    0,
    Math.min(
      100,
      lightnessBase +
        lightnessVarianceHash -
        lightnessVarianceDepth +
        lightnessOffset,
    ),
  )

  return `hsl(${Math.round(finalHue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`
}

export function hashPath(
  path: string,
  {
    hue = 0,
    saturation = 0,
    lightness = 0,
  }: {
    hue?: number
    saturation?: number
    lightness?: number
  } = {},
): string {
  return generateColor(path, { hue, saturation, lightness })
}
