// Radio presets for the Windows Media Player "Radio" page. Addresses are public internet streams
// (HLS or plain MP3/AAC); availability depends on the broadcaster.
export const RADIO_STATIONS = [
  { title: "TRT Radyo 1", group: "Türkiye", url: "https://radio-trt1.live.trt.com.tr/master_720.m3u8" },
  { title: "TRT FM", group: "Türkiye", url: "https://radio-trtfm.live.trt.com.tr/master_720.m3u8" },
  { title: "TRT Radyo 3", group: "Türkiye", url: "https://radio-trt3.live.trt.com.tr/master_720.m3u8" },
  { title: "TRT Nağme", group: "Türkiye", url: "https://radio-trtnagme.live.trt.com.tr/master_720.m3u8" },
  { title: "TRT Radyo Haber", group: "Haber", url: "https://radio-trthaber.live.trt.com.tr/master_720.m3u8" },
  { title: "BBC World Service", group: "Haber", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service" },
  { title: "Radio Paradise", group: "Müzik", url: "https://stream.radioparadise.com/mp3-192" },
  { title: "Radio Paradise Mellow", group: "Müzik", url: "https://stream.radioparadise.com/mellow-192" },
  { title: "KEXP 90.3 Seattle", group: "Müzik", url: "https://kexp.streamguys1.com/kexp160.aac" },
  { title: "SomaFM Groove Salad", group: "Elektronik", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
  { title: "SomaFM Drone Zone", group: "Elektronik", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { title: "SomaFM Secret Agent", group: "Elektronik", url: "https://ice1.somafm.com/secretagent-128-mp3" },
  { title: "SomaFM Sonic Universe", group: "Caz", url: "https://ice1.somafm.com/sonicuniverse-128-mp3" },
].map((s) => ({ ...s, live: true }));
