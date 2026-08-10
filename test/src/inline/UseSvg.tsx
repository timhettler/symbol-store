import React from "react";

export const SYMBOL_IDS = ["accessibility","bell","box","cookie","download","face","file","hand","heart-filled","heart","image","magic-wand","magnifying-glass","question-mark-circled","speaker-loud","square","stack","star-filled","star","sun","switch","symbol","trash","upload"] as const;
export type SYMBOL_IDS = typeof SYMBOL_IDS[number];

interface UseProps extends React.SVGProps<SVGSVGElement> {
  node: SYMBOL_IDS;
  /** Accessible name. Provided -> role="img" + <title>; omitted -> decorative. */
  title?: string;
}

/**
 * Renders an icon from the sprite.
 *
 * Decorative by default: hidden from assistive tech ("aria-hidden",
 * "focusable=false"). Pass a "title" to expose it as a meaningful image
 * ("role=img" with an accessible name and a <title> tooltip).
 */
export const UseSvg = ({ node, title, ...props }: UseProps) =>
  title ? (
    <svg role="img" aria-label={title} {...props}>
      <title>{title}</title>
      <use href={`#${node}`} />
    </svg>
  ) : (
    <svg aria-hidden="true" focusable="false" {...props}>
      <use href={`#${node}`} />
    </svg>
  );