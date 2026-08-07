import Link from "next/link";
import { preload } from "react-dom";
import { Code, Flex, Heading, Text } from "@radix-ui/themes";
import { IconPlayground } from "@/IconPlayground";

export default function SimplePage() {
  // Same-origin: preload the static sprite so the browser starts fetching it
  // before <use> renders. Verified in a production build — the preload is
  // consumed by <use> (a single download, no double-fetch).
  preload("/symbolstore.svg", { as: "image", type: "image/svg+xml" });

  return (
    <Flex direction="column" gap="3">
      <Heading as="h1" align="center">
        SymbolStore
      </Heading>
      <Text as="p">
        The simple, same-origin setup: the combined sprite is served straight
        from <Code>/public</Code> and referenced directly with{" "}
        <Code>&lt;use&gt;</Code>. No proxy, and no runtime JS to render icons —
        this is all most apps need. The sprite is preloaded for performance:
      </Text>
      <blockquote>
        <Code>{`preload("/symbolstore.svg", { as: "image", type: "image/svg+xml" });`}</Code>
      </blockquote>
      <Text as="p">
        Referenced by the generated <Code>UseSvg</Code> component:
      </Text>
      <blockquote>
        <Code
          style={{ whiteSpace: "pre" }}
        >{`export const UseSvg = ({ node, ...props }: UseProps) => (
  <svg {...props}>
    <use href={\`/symbolstore.svg#\${node}\`} />
  </svg>
);`}</Code>
      </blockquote>
      <IconPlayground variant="simple" />
      <Text as="p" size="2" color="gray" align="center">
        Hosting the sprite on a different origin (a CDN)?{" "}
        <Link href="/proxy">See the proxy example →</Link>
      </Text>
    </Flex>
  );
}
