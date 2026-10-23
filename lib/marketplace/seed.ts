import type { Category, EffectType, Platform, ProductFormat } from "./catalog"

/**
 * The listings Amarula adds itself, put on the marketplace by
 * scripts/marketplace-seed.ts. Paid plugins are bought from their makers;
 * free kits are downloaded and installed by the desktop app.
 */
export type SeedProduct = {
  slug: string
  title: string
  vendor: string
  category: Category
  description: string
  contents: string[]
  formats: ProductFormat[]
  platforms: Platform[]
  requires: string | null
  /** For effect plugins: what they do. */
  effectTypes?: EffectType[]
  priceCents: number
  /** Where to buy it; omitted for free products, which need a download. */
  storeUrl?: string
  sourceUrl: string | null
  /** Copied into the marketplace's storage. */
  imageUrl: string | null
  /**
   * For free products: how to find its zip (or folder) in the seed folder —
   * a name containing `match`, ignoring case, spaces and punctuation ("!" as
   * "i") — how it installs, and which platform it's for (any, by default).
   */
  download?: {
    match: string
    install: "samples" | "plugin"
    platform?: Platform
  }
}

const shadx2 = (handle: string) => `https://shadx2.net/products/${handle}`

/**
 * Free effects, in place of built-in ones: open-source plugins whose
 * licences let Amarula host them (each zip has the licence and where its
 * source is), then free ones only their makers may hand out, linked.
 * The desktop app offers them when there are no effects to add.
 */
const hostedEffect = (
  product: Omit<
    SeedProduct,
    "category" | "priceCents" | "requires" | "imageUrl" | "platforms"
  > & { match: string }
): SeedProduct => {
  const { match, ...fields } = product
  return {
    ...fields,
    category: "Plugins",
    platforms: ["macOS"],
    requires: null,
    priceCents: 0,
    imageUrl: null,
    download: { match, install: "plugin", platform: "macOS" },
  }
}

const freeEffects: SeedProduct[] = [
  hostedEffect({
    slug: "zl-equalizer-2",
    title: "ZL Equalizer 2",
    vendor: "ZL Audio",
    description:
      "A clean, modern parametric EQ: up to 16 bands with dynamic EQ, side-chain, mid/side and a live spectrum. Open source (AGPL-3.0).",
    contents: ["VST3 and AU for macOS (Apple Silicon)", "AGPL-3.0 licence"],
    formats: ["VST3", "AU"],
    effectTypes: ["eq", "filter"],
    sourceUrl: "https://github.com/ZL-Audio/ZLEqualizer",
    match: "zlequalizer",
  }),
  hostedEffect({
    slug: "zl-compressor",
    title: "ZL Compressor",
    vendor: "ZL Audio",
    description:
      "A versatile compressor with clean and characterful styles, side-chain, and a curve you can see. Open source (AGPL-3.0).",
    contents: ["VST3 and AU for macOS (Apple Silicon)", "AGPL-3.0 licence"],
    formats: ["VST3", "AU"],
    effectTypes: ["compressor"],
    sourceUrl: "https://github.com/ZL-Audio/ZLCompressor",
    match: "zlcompressor",
  }),
  hostedEffect({
    slug: "uhhyou-basiclimiter",
    title: "BasicLimiter",
    vendor: "Uhhyou",
    description:
      "A transparent single-band brickwall limiter with true-peak mode, for the end of the master chain. Open source (GPL-3.0).",
    contents: ["VST3 for macOS", "GPL-3.0 licence"],
    formats: ["VST3"],
    effectTypes: ["limiter"],
    sourceUrl:
      "https://ryukau.github.io/VSTPlugins/manual/BasicLimiter/BasicLimiter_en.html",
    match: "basiclimiter",
  }),
  hostedEffect({
    slug: "dragonfly-reverb",
    title: "Dragonfly Reverb",
    vendor: "Michael Willis",
    description:
      "Four reverbs in one download: Hall, Room, Plate and Early Reflections, from small rooms to huge halls. Open source (GPL-3.0).",
    contents: [
      "Hall, Room, Plate and Early Reflections (VST3 for macOS)",
      "GPL-3.0 licence",
    ],
    formats: ["VST3"],
    effectTypes: ["reverb"],
    sourceUrl: "https://github.com/michaelwillis/dragonfly-reverb",
    match: "dragonfly",
  }),
  hostedEffect({
    slug: "uhhyou-sevendelay",
    title: "SevenDelay",
    vendor: "Uhhyou",
    description:
      "A stereo delay that syncs to the tempo, with feedback filtering, ping-pong and modulation. Open source (GPL-3.0).",
    contents: ["VST3 for macOS", "GPL-3.0 licence"],
    formats: ["VST3"],
    effectTypes: ["delay"],
    sourceUrl:
      "https://ryukau.github.io/VSTPlugins/manual/SevenDelay/SevenDelay_en.html",
    match: "sevendelay",
  }),
  hostedEffect({
    slug: "chowmultitool",
    title: "ChowMultiTool",
    vendor: "Chowdhury DSP",
    description:
      "Filters (low-pass, high-pass, band-pass and more), an EQ, a waveshaper and a signal generator in one plugin. Open source (GPL-3.0).",
    contents: ["VST3 and AU for macOS", "GPL-3.0 licence"],
    formats: ["VST3", "AU"],
    effectTypes: ["filter", "eq"],
    sourceUrl: "https://github.com/Chowdhury-DSP/ChowMultiTool",
    match: "chowmultitool",
  }),
  {
    slug: "tdr-nova",
    title: "TDR Nova",
    vendor: "Tokyo Dawn Labs",
    category: "Plugins",
    description:
      "A parallel dynamic EQ: four bands that can each compress or expand, plus high- and low-pass filters. Free from its maker.",
    contents: ["VST3 and AU for macOS", "VST3 for Windows"],
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    requires: null,
    effectTypes: ["eq", "compressor"],
    priceCents: 0,
    storeUrl: "https://www.tokyodawn.net/tdr-nova/",
    sourceUrl: "https://www.tokyodawn.net/tdr-nova/",
    imageUrl: null,
  },
  {
    slug: "valhalla-supermassive",
    title: "Valhalla Supermassive",
    vendor: "Valhalla DSP",
    description:
      "Huge reverbs and echoes, from lush halls to endless delays. Free from its maker.",
    category: "Plugins",
    contents: ["VST3 and AU for macOS", "VST3 for Windows"],
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    requires: null,
    effectTypes: ["reverb", "delay"],
    priceCents: 0,
    storeUrl: "https://valhalladsp.com/shop/reverb/valhalla-supermassive/",
    sourceUrl: "https://valhalladsp.com/shop/reverb/valhalla-supermassive/",
    imageUrl: null,
  },
  {
    slug: "kilohearts-essentials",
    title: "Kilohearts Essentials",
    vendor: "Kilohearts",
    category: "Plugins",
    description:
      "Over 30 small, fast effects: EQ, compressor, filter, delay, reverb, limiter and more. Free from its maker.",
    contents: ["VST3 and AU for macOS", "VST3 for Windows"],
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    requires: null,
    effectTypes: ["eq", "compressor", "limiter", "reverb", "delay", "filter"],
    priceCents: 0,
    storeUrl: "https://kilohearts.com/products/kilohearts_essentials",
    sourceUrl: "https://kilohearts.com/products/kilohearts_essentials",
    imageUrl: null,
  },
]

export const seedProducts: SeedProduct[] = [
  {
    slug: "serum-2",
    title: "Serum 2",
    vendor: "Xfer Records",
    category: "Plugins",
    description:
      "Xfer's hybrid synthesizer: wavetable, multisample, granular and spectral oscillators, a deeper modulation matrix, and a rebuilt effects rack. Free for Serum 1 owners.",
    contents: [
      "VST3 and AU for macOS (Apple Silicon and Intel)",
      "VST3 for Windows",
      "Factory presets and wavetables",
    ],
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    requires: null,
    priceCents: 24900,
    storeUrl: "https://xferrecords.com/products/serum-2",
    sourceUrl: "https://xferrecords.com/products/serum-2",
    imageUrl:
      "https://xferrecords.com/assets/products-large/serum2_promo-3a72f21c8e6c81f5c65d1949cf6cd846cc793ad00def69d9ca18f46614f98778.png",
  },
  {
    slug: "omnisphere-3",
    title: "Omnisphere 3",
    vendor: "Spectrasonics",
    category: "Plugins",
    description:
      "Spectrasonics' flagship synthesizer, with a huge library of sounds, new synthesis and effects, and hardware synth integration.",
    contents: [
      "VST3 and AU for macOS",
      "VST3 for Windows",
      "Core sound library (large download from Spectrasonics)",
    ],
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    requires: null,
    priceCents: 49900,
    storeUrl: "https://www.spectrasonics.net/products/omnisphere/",
    sourceUrl: "https://www.spectrasonics.net/products/omnisphere/",
    imageUrl:
      "https://cdn.spectrasonics.net/website/sps/products/omni3-fb-x-thumb.jpg",
  },
  {
    slug: "zenology-pro",
    title: "ZENOLOGY Pro",
    vendor: "Roland",
    category: "Plugins",
    description:
      "Roland's software synthesizer built on the ZEN-Core engine, with sound editing, Model Expansions, and patches shared with Roland hardware. Lifetime Key from Roland Cloud.",
    contents: [
      "VST3 and AU for macOS",
      "VST3 for Windows",
      "Lifetime Key through Roland Cloud",
    ],
    formats: ["VST3", "AU"],
    platforms: ["macOS", "Windows"],
    requires: null,
    priceCents: 22900,
    storeUrl: "https://www.roland.com/global/products/rc_zenology_pro/",
    sourceUrl: "https://www.roland.com/global/products/rc_zenology_pro/",
    imageUrl:
      "https://static.roland.com/assets/images/products/main/rc_zenology_pro_main.jpg",
  },
  {
    slug: "shadx2-hyperpink-demo",
    title: "HYPERP!NK Demo",
    vendor: "shadx2",
    category: "Sound kits",
    description:
      "100+ sounds from HYPERP!NK, inspired by 2hollis, nate sib, slayr, ginseng and botanica.",
    contents: ["100+ drums, textures and FX (WAV)"],
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    requires: null,
    priceCents: 0,
    sourceUrl: shadx2("hyperpink-demo"),
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/3397/7172/files/hyperpink_demo_cover_art.png",
    download: { match: "hyperpink", install: "samples" },
  },
  {
    slug: "shadx2-ultrapink-demo",
    title: "ULTRAP!NK Demo",
    vendor: "shadx2",
    category: "Sound kits",
    description:
      "110+ sounds pulled from ULTRAP!NK: 808s, kicks, claps, snares, percs, glitches, digital textures and vox, mix-ready for underground digital beats.",
    contents: ["808s and drums", "Glitches, FX and textures", "Vox"],
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    requires: null,
    priceCents: 0,
    sourceUrl: shadx2("ultrapink-demo"),
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/3397/7172/files/ultrapink_assets_-_Artboard_11.png",
    download: { match: "ultrapink", install: "samples" },
  },
  {
    slug: "shadx2-x10k-demo",
    title: "x10K Multi-Kit Demo",
    vendor: "shadx2",
    category: "Drum kits",
    description:
      "Custom 808s, hard-hitting claps and snares, bouncy hi-hats and unique FX: digital, maximalist drums, pre-mixed and time-stretched.",
    contents: ["808s", "Claps, snares and hi-hats", "FX"],
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    requires: null,
    priceCents: 0,
    sourceUrl: shadx2("x10k-demo"),
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/3397/7172/files/x10kkk.png",
    download: { match: "x10k", install: "samples" },
  },
  {
    slug: "shadx2-x1000",
    title: "x1000 Drumkit",
    vendor: "shadx2",
    category: "Drum kits",
    description:
      "The second in the x series, for hyperpop, pluggnb and new jazz: 808s, kicks, claps, hats, snares, percs, risers, crashes, FX and bonus loops.",
    contents: [
      "808s and kicks",
      "Claps, hats, snares and percs",
      "FX and loops",
    ],
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    requires: null,
    priceCents: 0,
    sourceUrl: shadx2("x1000-drumkit"),
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/3397/7172/files/x100000.png",
    download: { match: "x1000", install: "samples" },
  },
  {
    slug: "shadx2-x500",
    title: "x500 Drumkit",
    vendor: "shadx2",
    category: "Drum kits",
    description:
      "The first in the x series: 200+ hand-picked sounds mixed for new jazz and pluggnb beats.",
    contents: ["200+ drums and sounds (WAV)"],
    formats: ["WAV"],
    platforms: ["macOS", "Windows", "Linux"],
    requires: null,
    priceCents: 0,
    sourceUrl: shadx2("x500-drumkit"),
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0685/3397/7172/files/x500000.png",
    download: { match: "x500", install: "samples" },
  },
  ...freeEffects,
]
