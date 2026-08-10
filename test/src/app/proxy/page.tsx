import Link from "next/link";
import { preload } from "react-dom";
import { Code, Flex, Heading, Text } from "@radix-ui/themes";
import { IconPlayground } from "@/IconPlayground";

export default function ProxyPage() {
  // Cross-origin: preload the same-origin proxy endpoint (not the CDN file).
  preload("/api/symbol-store", { as: "fetch", crossOrigin: "anonymous" });

  return (
    <Flex direction="column" gap="3">
      <Heading as="h1" align="center">
        SymbolStore — proxy
      </Heading>
      <Text as="p">
        This page serves the sprite through a same-origin proxy route (
        <Code>/api/symbol-store</Code>). Because SVG <Code>&lt;use&gt;</Code>{" "}
        cannot load cross-origin, routing the reference through a same-origin
        handler is what lets the underlying sprite live on a CDN. The endpoint is
        preloaded for performance:
      </Text>
      <blockquote>
        <Code>{`preload("/api/symbol-store", { as: "fetch", crossOrigin: "anonymous" });`}</Code>
      </blockquote>
      <Text as="p">
        Referenced by the generated <Code>Icon</Code> component:
      </Text>
      <blockquote>
        <Code
          style={{ whiteSpace: "pre" }}
        >{`export const Icon = ({ node, ...props }: IconProps) => (
  <svg {...props}>
    <use href={\`/api/symbol-store#\${node}\`} />
  </svg>
);`}</Code>
      </blockquote>
      <IconPlayground variant="proxy" />
      <Text as="p" size="2" color="gray" align="center">
        <Link href="/">← Back to the simple example</Link>
      </Text>
    </Flex>
  );
}
