"use client";

import { DriftClientProvider } from "@/providers/drift-client-provider";

import VaultsFeature from "@/components/vaults/vaults-feature";

export default function Page() {
  return (
    <DriftClientProvider>
      <VaultsFeature />
    </DriftClientProvider>
  );
}
