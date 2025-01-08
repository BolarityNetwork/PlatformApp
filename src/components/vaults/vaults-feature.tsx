"use client";

import React from "react";

import { AccountInfo } from "../widgets/account-info";
import { StakeTable } from "./vaults-ui";

const VaultsFeature = () => {
  return (
    <main className="container">
      <div className="padding-y flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12">
        <div className="g-card"><AccountInfo /></div>
        <div className="g-card"><StakeTable /></div>
      </div>
    </main>
  );
};

export default VaultsFeature;
