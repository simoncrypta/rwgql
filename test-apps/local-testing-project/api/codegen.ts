import type { CodegenConfig } from "@graphql-codegen/cli";
import { clientScalars, createRedwoodResolverGenerateEntry } from "@rwgql/graphql-typegen/codegen";
export default {
  schema: "schema.graphql",
  documents: ["../web/src/**/*.tsx"],
  generates: {
    ...createRedwoodResolverGenerateEntry({
      contextType: "../src/functions/graphql.js#YogaContext",
    }),
    "../web/types/graphql.d.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        useTypeImports: true,
        namingConvention: "keep",
        omitOperationSuffix: true,
        avoidOptionals: true,
        scalars: clientScalars,
      },
    },
  },
} satisfies CodegenConfig;
