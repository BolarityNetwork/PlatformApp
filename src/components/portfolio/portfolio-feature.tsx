"use client";

import { AccountInfo } from "../widgets/account-info";
import { AssetsTable } from "./portfolio-ui";

export default function PortfolioFeature() {
  return (
    <main className="container">
      <div className="padding-y flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12">
        <div className="g-card">
          <AccountInfo />
        </div>
        <div className="g-card">
          <AssetsTable />
        </div>
      </div>
    </main>
  );
}
