"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";
import base58 from "bs58";
import { SiSolana } from "react-icons/si";

import { deserialize } from "borsh";

import { ellipsify, getExplorerLink } from "@/lib/utils";
import {
  BallotBoxSchema,
  FinalTransactionSchema,
  NcnSchema,
  NcnTableData,
  NcnTableHeaderArr,
  RelayerInfoSchema,
  genFinalTxPDAAccount,
  genBallotBoxPDAAccount,
  genPDAAccount,
} from "./ncn-data";
import { DataTableDemo } from "./table";

// import { Separator } from "../ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

const ncn = "8SaaXbfK7A3KuNY38mjc6NoXFZskk6d2hZeRc7snLjaG";
const relayerHub = "39djqgS6KR6SWb3T39bTj8QMX3iuMMLP41PVjk89ieJh";
const relayerNcn = "4Y4KoE1Tc77EfTg2V6qpCCfeeJa3eu61VxpQ2ih8ebxh";

export const NCNInfo = () => {
  const { connection } = useConnection();

  // Fetch epoch info
  const { data: epochData } = useQuery({
    queryKey: ["getEpochInfoHttp"],
    queryFn: async () => await connection.getEpochInfo(),
    refetchInterval: 15000,
  });
  console.log("Fetch epoch info", epochData);

  // Fetch operator count info
  const { data: operatorData } = useQuery({
    queryKey: ["getOperatorCountHttp"],
    queryFn: async () => await connection.getAccountInfo(new PublicKey(ncn)),
    refetchInterval: 15000,
  });

  // Fetch relayer count info
  const { data: relayerData } = useQuery({
    queryKey: ["getRelayerCountHttp"],
    queryFn: async () =>
      await connection.getAccountInfo(
        await genPDAAccount("relayer_info", new PublicKey(relayerHub))
      ),
    refetchInterval: 15000,
  });
  // console.log("Fetch relayer count info", relayerData);

  // Fetch final transaction status
  const { data: finalTxData } = useQuery({
    queryKey: ["getFinalTxStatusHttp"],
    queryFn: async () => {
      const epochNum = epochData?.epoch || 0;
      const epochBuffer = genFinalTxPDAAccount(
        new PublicKey(relayerHub),
        epochNum - 1
      );
      console.log("epochBuffer----epochData", epochData?.epoch);
      console.log("epochBuffer", epochBuffer);
      console.log("epochBuffer--base58", epochBuffer.toBase58());
      const finalRes = await connection.getAccountInfo(epochBuffer);
      console.log("epochBuffer---finalRes", finalRes);

      return finalRes;
    },
    refetchInterval: 15000,
  });

  console.log("finalTxData", finalTxData);

  const getStatusAddress = useMemo(() => {
    if (epochData?.epoch) {
      const epochNum = epochData?.epoch || 0;
      const epochBuffer = genFinalTxPDAAccount(
        new PublicKey(relayerHub),
        epochNum - 1
      );

      return epochBuffer.toBase58();
    }
    return "0";
  }, [epochData]);

  // Extract and memoize values
  const operatorCount = useMemo(() => {
    if (operatorData) {
      return Number(deserialize(NcnSchema, operatorData.data)?.operator_count);
    }
    return 0;
  }, [operatorData]);

  const relayerCount = useMemo(() => {
    if (relayerData) {
      const encoded = deserialize(RelayerInfoSchema, relayerData.data);
      return Number(encoded?.number);
    }
    return 0;
  }, [relayerData]);

  const currentStatus = useMemo(() => {
    console.log("Current State----finalTxData:", finalTxData);
    let state = {
      status: "Uninitialized",
      stateRoot: "0",
    };
    if (finalTxData) {
      const encoded = deserialize(FinalTransactionSchema, finalTxData.data);
      console.log("Current State----encoded:", encoded);
      // const stateRootHex_16 = encoded?.state_root.toString("hex");
      const stateRootHex = Buffer.from(encoded?.state_root).toString("hex");
      // console.log("State Root---stateRootHex_16:", stateRootHex_16);
      console.log("State Root:", stateRootHex);
      console.log(
        "State Root:",
        new PublicKey(encoded?.state_root)?.toBase58()
      );

      if (Number(encoded?.epoch) !== 0) {
        // return encoded?.accepted ? "Accepted" : "Rejected";
        return (state = {
          status: encoded?.accepted ? "Accepted" : "Rejected",
          stateRoot:
            stateRootHex.length > 0
              ? new PublicKey(encoded?.state_root)?.toBase58()
              : "0",
        });
      }
      // return "Initialized";
      return (state = {
        status: "Initialized",
        stateRoot: "0",
      });
    }

    // return  "Uninitialized";
    return state;
  }, [finalTxData]);

  return (
    // <div className="h-auto lg:h-16 flex flex-col md:flex-row justify-evenly lg:flex-row items-center gap-y-4 gap-x-4 md:gap-x-6 xl:gap-x-12">
    <div className="h-auto lg:h-16 flex flex-wrap md:flex-row justify-evenly lg:flex-row items-center gap-y-4 gap-x-4 md:gap-x-6 xl:gap-x-12">
      <StatCard label="NCN Operators" value={operatorCount} />
      {/* <Separator orientation="vertical" className="hidden md:block" /> */}
      <StatCard label="Relayers" value={relayerCount} />
      {/* <Separator orientation="vertical" className="hidden md:block" /> */}
      <StatCard
        label="Latest Root"
        value={currentStatus.stateRoot}
        copyStatus={getStatusAddress === "0" ? 0 : getStatusAddress}
      />
      {/* <Separator orientation="vertical" className="hidden md:block" /> */}
      <StatCard label="Current State" value={currentStatus.status} />
      {/* <Separator orientation="vertical" className="hidden md:block" /> */}
      <StatCard label="Current Epoch" value={epochData?.epoch || 0} />
    </div>
  );
};

function TooltipButton({ address }: { address: string | number }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() =>
        window.open(
          getExplorerLink("address", address?.toString(), "devnet"),
          "_blank"
        )
      }
    >
      <SiSolana />
    </Button>
  );
}

// Simple stat card component
const StatCard = ({
  label,
  value,
  copyStatus = 0,
}: {
  label: string;
  value: string | number;
  copyStatus?: number | string;
}) => (
  <div className="flex flex-col items-center lg:items-start gap-y-2">
    <p className="md:text-sm text-xs text-muted-foreground text-center lg:text-left">
      {label}
    </p>
    <div className="flex items-center gap-x-3">
      <p className="md:text-2xl text-sm font-bold">
        {(copyStatus && ellipsify(value?.toString())) || value}
      </p>
      {(copyStatus && <TooltipButton address={copyStatus} />) || ""}
    </div>
  </div>
);

export const NcnTable = () => {
  const { connection } = useConnection();
  const [currentInit, setCurrentInit] = useState<number>(0);
  const [operatorStateRoots, setOperatorStateRoots] = useState<
    Record<number, string | number>
  >({});

  // 获取 epoch 信息
  const fetchEpochInfo = async () => {
    try {
      console.log("Fetching epoch info...");
      const accountInfo = await connection.getEpochInfo();
      console.log("accountInfo---epoch:", accountInfo);
      if (accountInfo?.epoch) {
        setCurrentInit(Number(accountInfo.epoch));
      } else {
        console.log("Fetch failed: not activated.");
      }
    } catch (err) {
      console.error("Fetch failed: ", err);
    }
  };

  // 获取 operator 的 state root
  const getOperatorStateRoot = async (
    accountPublicKey: PublicKey,
    operator: PublicKey
  ) => {
    const accountInfo = await connection.getAccountInfo(accountPublicKey);
    if (!accountInfo) return 0;

    const encoded = deserialize(BallotBoxSchema, accountInfo.data);
    const operatorVotes = encoded?.operator_votes;
    const operatorEncoded = base58.encode(operator.toBuffer());

    const matchedVote = operatorVotes?.find(
      (vote) =>
        vote.slot_voted !== 0 &&
        base58.encode(vote.operator) === operatorEncoded
    );

    return matchedVote
      ? encoded?.ballot_tallies[matchedVote.ballot_index].ballot
          .meta_merkle_root
      : 0;
  };

  // 获取 operator state root 的 wrapper
  const getOperatorStateRoot2 = async (
    epochNumber: number,
    address: string
  ) => {
    try {
      const ballotBox = await genBallotBoxPDAAccount(
        new PublicKey(relayerNcn),
        new PublicKey(ncn),
        epochNumber - 1
      );
      const dataOperator = await getOperatorStateRoot(
        ballotBox,
        new PublicKey(address)
      );

      return new PublicKey(dataOperator)?.toBase58() || 0;
    } catch (err) {
      console.log("Error fetching operator state root:", err);
      return 0;
    }
  };

  // 在组件挂载时获取 epoch 信息
  useEffect(() => {
    fetchEpochInfo();
  }, []); // 只在挂载时执行

  // 获取多个 operator 状态
  const fetchOperatorState = async () => {
    if (!currentInit) return;

    const roots: Record<number, string | number> = {};
    for (let i = 0; i < 3; i++) {
      // 假设有 3 个 operator 数据
      const result = await getOperatorStateRoot2(
        currentInit,
        NcnTableData[i].recent_vote
      );
      roots[i] = result;
    }
    setOperatorStateRoots(roots);
  };

  useEffect(() => {
    if (currentInit) {
      fetchOperatorState();
    }
  }, [currentInit]); // 当前 epoch 更新时重新获取数据

  // 渲染表格行的通用组件
  const renderTableRow = (index: number) => {
    const operatorStateRoot = operatorStateRoots[index] ?? "-";
    const operatorData = NcnTableData[index];
    // console.log("operatorData", operatorData);

    return (
      <TableRow key={index}>
        <TableCell className="p-3 w-[100px] lg:w-[160px] xl:w-[240px]">
          <div className="flex gap-2 items-center">
            <div className="hidden xl:block p-2 rounded-full bg-secondary">
              <Image
                src={"/solana.svg"}
                alt="SOL_ICON"
                width={24}
                height={24}
              />
            </div>
            <h4 className="xl:text-lg font-bold uppercase">
              {ellipsify(operatorData.operator)}
            </h4>
          </div>
        </TableCell>
        <TableCell className="text-center">
          {operatorData.online_rate}
          <span className="text-muted-foreground">&nbsp;%</span>
        </TableCell>
        <TableCell className="text-center">SOL</TableCell>
        <TableCell className="text-center">
          {ellipsify(operatorStateRoot)}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-lg md:text-2xl xl:text-4xl font-bold">
          NCN Operators
        </h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {NcnTableHeaderArr.map((item, index) => (
              <TableHead key={index} className="p-3 text-center">
                {item}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {NcnTableData.map((_, index) => renderTableRow(index))}
        </TableBody>
      </Table>
    </>
  );
};
export const NcnRewards = () => {
  return <DataTableDemo />;
};
