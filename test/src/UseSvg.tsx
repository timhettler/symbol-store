import React from "react";

export const SYMBOL_IDS = ["accessibility","bell","box","cookie","download","face","file","hand","heart-filled","heart","image","magic-wand","magnifying-glass","question-mark-circled","speaker-loud","square","stack","star-filled","star","sun","switch","symbol","trash","upload"] as const;
export type SYMBOL_IDS = typeof SYMBOL_IDS[number];

interface UseProps extends React.SVGProps<SVGSVGElement> {
  node: SYMBOL_IDS;
}

export const UseSvg = ({ node, ...props }: UseProps) => (
  <svg {...props}>
    <use href={`/spritemap.svg#${node}`} />
  </svg>
);