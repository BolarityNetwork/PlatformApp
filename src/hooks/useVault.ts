import { useMutation } from "@tanstack/react-query";
import { API_URL } from "@/config";

const base_url = `${API_URL}/api/v1/payload`;
const initialize_user_stats_url = base_url + "/initialize_user",
  create_account_and_init_url = base_url + "/create_account_and_init",
  deposit_sol_url = base_url + "/deposit_sol_and_close",
  withdraw_sol_url = base_url + "/withdraw_sol_and_close",
  deposit_spl_url = base_url + "/deposit_token",
  withdraw_spl_url = base_url + "/withdraw_token";

export interface BasePayload {
  address: string;
  relayer_solana_contract: string;
  emitter_chain: number;
}

export interface OrderPayload extends BasePayload {
  sub_account_id: number;
  name: string;
}

export interface CreatePayload extends BasePayload {
  seed: string;
  amount: string;
  include_rent: boolean;
}
export interface DepositPayload extends BasePayload {
  seed: string;
  amount: string;
  sub_account_id: number;
  market_index: number;
}
export interface SPLTokenPayload extends BasePayload {
  associated_token_account: string;
}

export const useVaultOrder = () => {
  function createMutation<PayloadType>(url: string) {
    return useMutation({
      mutationFn: async (payload: PayloadType) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to submit telegram order");
        }

        return response.json();
      },
    });
  }
  const initializeUserStatsMutation = createMutation<OrderPayload>(
    initialize_user_stats_url
  );
  const create_account_and_initMutation = createMutation<CreatePayload>(
    create_account_and_init_url
  );
  const deposit_sol_and_closeMutation =
    createMutation<DepositPayload>(deposit_sol_url);
  const withdraw_sol_and_closeMutation =
    createMutation<DepositPayload>(withdraw_sol_url);
  const deposit_spl_and_closeMutation =
    createMutation<SPLTokenPayload>(deposit_spl_url);
  const withdraw_spl_and_closeMutation =
    createMutation<SPLTokenPayload>(withdraw_spl_url);

  return {
    initializeUserStatsMutation,
    isLoading: initializeUserStatsMutation.isPending,
    create_account_and_initMutation,
    withdraw_sol_and_closeMutation,
    deposit_sol_and_closeMutation,
    deposit_spl_and_closeMutation,
    withdraw_spl_and_closeMutation,
  };
};
