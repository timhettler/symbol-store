import Link from "next/link";
import { Code, Flex, Heading, Text } from "@radix-ui/themes";
import { IconPlayground } from "@/IconPlayground";

export default function SimplePage() {
  return (
    <Flex direction="column" gap="3">
      <Heading as="h1" align="center">
        SymbolStore
      </Heading>
      <Text as="p">
        The simple, same-origin setup: the combined sprite is served straight
        from <Code>/public</Code> and referenced directly with{" "}
        <Code>&lt;use&gt;</Code>. No proxy, no runtime JS — this is all most apps
        need.
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
