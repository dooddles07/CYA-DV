import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CYA Daily Verse — God's Word, every morning";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #0095ff 0%, #0089ec 50%, #33b1ff 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          Christ&apos;s Youth in Action
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
            God&apos;s Word, every morning.
          </div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 24, opacity: 0.9, maxWidth: 900 }}>
            Daily verses, devotionals, reading plans, and a praying community.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex" }}>CYA Daily Verse</div>
          <div style={{ display: "flex", opacity: 0.85 }}>Kay Kristo Buong Buhay, Habambuhay!</div>
        </div>
      </div>
    ),
    size
  );
}
