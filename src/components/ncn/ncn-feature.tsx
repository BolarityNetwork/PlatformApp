"use client";
import Image from "next/image";
import { NcnRewards, NcnTable, NCNInfo } from "./ncn-ui";
import { ellipsify } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { FaGithub, FaSquareXTwitter } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const x_url = "https://x.com/bolarityxyz",
  github_url = "https://github.com/BolarityNetwork",
  website_url = "https://www.bolarity.xyz",
  relayerNcn = "4Y4KoE1Tc77EfTg2V6qpCCfeeJa3eu61VxpQ2ih8ebxh";

const SocialButton = ({
  icon,
  url,
  alt,
}: {
  icon: React.ReactNode;
  url: string;
  alt: string;
}) => (
  <Button
    variant="ghost"
    size="icon"
    className="rounded-full bg-card p-2 block mr-2 flex items-center justify-center"
    onClick={() => window.open(url, "_blank")}
    aria-label={`Open ${alt}`}
  >
    {icon}
  </Button>
);

export default function NcnFeature() {
  const { copiedText, copyToClipboard } = useCopyToClipboard();

  return (
    <main className="container flex flex-col md:flex-row">
      {/* Left Column */}
      <div className="flex-1 flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12 py-4">
        <div className="g-card">
          <NCNInfo />
        </div>
        <div className="g-card">
          <NcnTable />
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full  md:w-1/3  md:ml-2 py-4 flex flex-col gap-y-4 md:gap-y-8 xl:gap-y-12">
        <div className="g-card md:!pb-2">
          <NcnRewards />
        </div>

        <div className="g-card !bg-secondary md:!py-0">
          {/* About Bolarity */}
          <h2 className="text-lg md:text-xl xl:text-2xl font-bold">
            About Bolarity
          </h2>
          <p className="text-sm">
            Bolarity Network - A Platform Empowering Any Chain to Seamlessly
            Interact with All Chains and Applications via HybridVM.
          </p>

          {/* Social Links */}
          <div className="flex my-2 items-center">
            <SocialButton
              icon={<FaGithub size={28} />}
              url={github_url}
              alt="GitHub"
            />
            <SocialButton
              icon={<FaSquareXTwitter size={28} />}
              url={x_url}
              alt="Twitter"
            />
            <SocialButton
              icon={
                <Image
                  src={"/bolarity.webp"}
                  alt="Bolarity"
                  width={28}
                  height={28}
                />
              }
              url={website_url}
              alt="Bolarity Website"
            />
          </div>

          {/* NCN Contract */}
          <h2 className="text-lg md:text-xl xl:text-2xl font-bold mt-4">
            NCN Contract
          </h2>
          <div className="flex items-center justify-between bg-card mt-2 py-2 px-4 rounded-full">
            <p className="text-sm font-bold">{ellipsify(relayerNcn, 4)}</p>
            <Button
              size="4"
              onClick={() => copyToClipboard(relayerNcn)}
              variant="ghost"
              aria-label="Copy contract address"
            >
              {copiedText === relayerNcn ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
