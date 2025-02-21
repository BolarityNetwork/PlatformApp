import React from "react";
import { SelectContent, SelectItem } from "@/components/ui/select";


import Image from "next/image";
import { FromChainType } from "./data";


const SelectContentComponent = ({
  selectList,
}: {
  selectList: FromChainType[];
}) => (


  <SelectContent>
    {selectList.map((item, idx) => (
      <SelectItem value={item.value} key={idx + "fromChain"}>
        <div className="flex gap-x-3 items-center">
          <div className="hidden xl:block p-2 rounded-full bg-secondary">
            <Image src={item.iconUrl} alt={item.name} width={18} height={18} />
          </div>
          <span className="text-lg">
            {(selectList.length > 2 && item.name) || item.text}
          </span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>


);

export default SelectContentComponent;
