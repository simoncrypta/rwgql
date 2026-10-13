import type { CodegenConfig } from "@graphql-codegen/cli";
import { clientScalars, createRedwoodResolverGenerateEntry } from "@rwgql/graphql-typegen/codegen";

const schemaPath = "./schema.graphql";

const clientOutput = (webRoot: string) => ({
  [`${webRoot}/src/gql/`]: {
    documents: [`${webRoot}/src/components/**/*.{ts,tsx}`, `${webRoot}/src/pages/**/*.{ts,tsx}`],
    preset: "client" as const,
    presetConfig: {
      fragmentMasking: { unmaskFunctionName: "getFragmentData" },
    },
    config: {
      useTypeImports: true,
      enumsAsTypes: true,
      scalars: clientScalars,
    },
  },
});

const config: CodegenConfig = {
  schema: schemaPath,
  ignoreNoDocuments: true,
  generates: {
    ...clientOutput("../rwsdk/web"),
    ...clientOutput("../cedar/web"),
    ...createRedwoodResolverGenerateEntry(),
  },
};

export default config;
