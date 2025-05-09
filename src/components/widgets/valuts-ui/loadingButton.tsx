import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";

const LoadingButton = ({
  isLoading,
  isDeposit,
}: {
  isLoading: boolean;
  isDeposit: boolean;
}) => (
  <Button
    type="submit"
    className="bg-primary text-white px-4 py-2 rounded-md"
    disabled={isLoading}
  >
    {isLoading ? (
      <>
        <Loading className="w-4 h-4 mr-1" />
        <span>{isDeposit ? "Deposit..." : "Withdraw..."}</span>
      </>
    ) : isDeposit ? (
      "Deposit"
    ) : (
      "Withdraw"
    )}
  </Button>
);
export default LoadingButton;
