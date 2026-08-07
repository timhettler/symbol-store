"use client";

import { useState } from "react";
import { startTransition } from "react";
import { SYMBOL_IDS, UseSvg } from "./UseSvg";
import { Checkbox, Code, Flex, Heading, Select, Text } from "@radix-ui/themes";
export const Sprite = () => {
  const [name, setName] = useState<SYMBOL_IDS>(SYMBOL_IDS[0]);
  const [color, setColor] = useState("#BADA55");
  const [currentColorOverride, setCurrentColorOverride] = useState(false);

  return (
    <Flex direction="column" gap="3">
      <Heading as="h1" align="center">
        SymbolStore
      </Heading>
      <Text as="p">
        This demo serves a single combined SVG sprite through a same-origin
        proxy route (<Code>/api/symbol-store</Code>). Because SVG{" "}
        <Code>&lt;use&gt;</Code> cannot load cross-origin, routing the reference
        through a same-origin handler is what lets the underlying sprite live on
        a CDN. The endpoint is preloaded by the root layout for performance:
      </Text>
      <blockquote>
        <Code>{`preload("/api/symbol-store", { as: "fetch" });`}</Code>
      </blockquote>
      <Text as="p">
        It is referenced by the generated <Code>UseSvg</Code> component:
      </Text>
      <blockquote>
        <Code
          style={{ whiteSpace: "pre" }}
        >{`export const UseSvg = ({ node, ...props }: UseProps) => (
  <svg {...props}>
    <use href={\`/api/symbol-store#\${node}\`} />
  </svg>
);`}</Code>
      </blockquote>
      <UseSvg
        node={name}
        fill={currentColorOverride ? "currentColor" : color}
      />
      <Text as="p">Icon:</Text>
      <Select.Root
        value={name}
        onValueChange={(v) => startTransition(() => setName(v as SYMBOL_IDS))}
      >
        <Select.Trigger>{name}</Select.Trigger>
        <Select.Content>
          {SYMBOL_IDS.map((id) => (
            <Select.Item key={id} value={id}>
              {id}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Text as="p">Color:</Text>
      <input
        type="color"
        defaultValue={color}
        onChange={(e) => startTransition(() => setColor(e.target.value))}
      />
      <Flex align="center" gap="2" asChild>
        <label>
          <Checkbox
            defaultChecked={currentColorOverride}
            onCheckedChange={(c) => setCurrentColorOverride(!!c)}
          />
          <Text>Use text color</Text>
        </label>
      </Flex>
    </Flex>
  );
};
