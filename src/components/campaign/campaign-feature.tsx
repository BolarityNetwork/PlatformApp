"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { NFTCard } from "./campaign-ui";
import { AccountInfo } from "../widgets/account-info";
import { Skeleton } from "@/components/ui/skeleton";

import { RefreshCcwIcon } from "lucide-react";

import { initialNFTs, NFTItem } from "./campaign-data";

const CampaignFeature = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nftList, setNftList] = useState(initialNFTs as NFTItem[]);

  // Simulate refreshing NFT data
  const handleRefresh = () => {
    setNftList([]);
    setIsRefreshing(true);
    // Simulate API call with timeout
    setTimeout(() => {
      // In a real app, you would fetch new data here
      setNftList(initialNFTs);
      setIsRefreshing(false);
    }, 2000);
  };

  return (
    <main className="container">
      <div className="padding-y flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12">
        <div className="g-card">
          <AccountInfo />
        </div>

        <div className="g-card">
          <div className="flex justify-between items-center md:mb-4">
            <h2 className="text-lg md:text-2xl xl:text-4xl font-bold">
              NFT Collection
            </h2>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh NFT collection"
            >
              <RefreshCcwIcon
                className={`h-5 w-5 ${
                  isRefreshing ? "animate-spin text-gray-400" : "text-primary"
                }`}
              />
            </Button>
          </div>

          {nftList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {nftList.map((nft: NFTItem, index: number) => (
                <NFTCard key={index} nft={nft} index={index} />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <Skeleton className="h-80 w-80 " />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CampaignFeature;
