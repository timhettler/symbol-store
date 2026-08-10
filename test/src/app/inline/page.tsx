import Link from "next/link";
import { Code, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { SYMBOL_IDS, Icon } from "@/inline/Icon";
import { SymbolStoreSprite } from "@/inline/SymbolStoreSprite";

export default function InlinePage() {
  return (
    <Flex direction="column" gap="3">
      {/* Inject the sprite once. <use href="#id"> then resolves in-document — no
          proxy, works from any origin, no client JS. */}
      <SymbolStoreSprite />
      <Heading as="h1" align="center">
        SymbolStore — inline
      </Heading>
      <Text as="p">
        The sprite is <strong>inlined</strong> into the document by a single{" "}
        <Code>&lt;SymbolStoreSprite /&gt;</Code> (rendered once, here on the
        page). Because the definitions live in the same document,{" "}
        <Code>&lt;use href=&quot;#icon&quot;&gt;</Code> resolves without a proxy
        and works cross-origin — with no runtime JS to render icons.
      </Text>
      <blockquote>
        <Code style={{ whiteSpace: "pre" }}>{`<use href={\`#\${node}\`} />`}</Code>
      </blockquote>
      <Grid columns={{ initial: "4", sm: "6" }} gap="4" align="center">
        {SYMBOL_IDS.map((id) => (
          <Flex key={id} direction="column" align="center" gap="1">
            <Icon node={id} width={28} height={28} fill="var(--gray-12)" />
            <Text size="1" color="gray">
              {id}
            </Text>
          </Flex>
        ))}
      </Grid>
      <Text as="p" size="2" color="gray" align="center">
        <Link href="/">← Back to the simple example</Link>
      </Text>
    </Flex>
  );
}
