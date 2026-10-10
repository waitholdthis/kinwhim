import type { ImgHTMLAttributes } from "react";

// Kinwhim photos are private: /api/media checks the viewer's session cookie,
// and selfie previews are local blob: URLs. next/image would route them
// through the server-side optimizer, which fetches without the viewer's
// cookie (so private media 401s) and can't read blob: URLs at all. A plain
// <img> loaded lazily is the right tool here.
export function PrivateImage({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- see the comment above
  return <img alt={alt} loading="lazy" decoding="async" {...props} />;
}
