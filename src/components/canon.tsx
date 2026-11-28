import { cn } from "@/lib/utils";

/** Canon, the AI fact-checker character, leaning on the claim card and reading a paper.
 * A still picture (his eyes never change); he only leans back and forth very slightly
 * (`.canon-sway` in styles.css).
 *
 * The picture is 505 x 963, cut from the 2000 x 1129 artwork at x 392, y 89. To lean him on
 * a card the way the artwork does: the card's left edge is at 88.3% of his width (his ear
 * overlaps it), and the card's top is at 24.6% of his height. In Arabic the page mirrors
 * him with `rtl:-scale-x-100`. */

const IMG_W = 505;
const IMG_H = 963;

export function Canon({ alt, className }: { alt: string; className?: string }) {
  return (
    <div
      className={cn("canon-sway relative select-none", className)}
      style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
    >
      <img
        src="/images/canon-reading.webp"
        alt={alt}
        width={IMG_W}
        height={IMG_H}
        draggable={false}
        className="absolute inset-0 h-full w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.45)]"
      />
    </div>
  );
}
