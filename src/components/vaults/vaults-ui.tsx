"use client";

import Image from "next/image";
import { RefreshCcwIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";
import { FaEthereum } from "react-icons/fa";

export const StakeTable = () => {
  
  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-lg md:text-2xl xl:text-4xl font-bold"></h2>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={async () => {
            // await fetchBalance();
          }}
        >
          <RefreshCcwIcon className="h-5 w-5 text-primary" />
        </Button>
      </div>
      <Table className="mt-0 md:mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="p-3"></TableHead>
            <TableHead className="p-3">NETWORK</TableHead>
            <TableHead className="p-3">WALLET</TableHead>
            <TableHead className="p-3">DEPOSITED</TableHead>
            <TableHead className="hidden md:table-cell p-3">APY</TableHead>
            <TableHead className="hidden md:table-cell p-3">DAILY</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
        <TableRow>
      <TableCell className="p-3 lg:w-[160px] xl:w-[240px]">
        <div className="flex gap-2 items-center">
          <div className="hidden xl:block p-2 rounded-full bg-secondary">
            <Image src="/tether.png" alt="tether" width={24} height={24} />
          </div>
          <h4 className="xl:text-lg font-bold uppercase">USDT</h4>
        </div>
      </TableCell>
      <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
        <FaEthereum className="h-5 w-5" />
      </TableCell>
      <TableCell className="p-3 font-bold lg:w-[100px] xl:w-[160px]">
        0
      </TableCell>
      <TableCell className="hidden md:table-cell p-3 font-bold lg:w-[100px] xl:w-[160px]">
        0
      </TableCell>
      <TableCell className="hidden md:table-cell p-3 font-bold lg:w-[100px] xl:w-[160px]">
        -
      </TableCell>
      <TableCell className="hidden md:table-cell p-3 font-bold lg:w-[100px] xl:w-[160px]">
        -
      </TableCell>
    </TableRow>
        </TableBody>
      </Table>      
    </>
  );
};
