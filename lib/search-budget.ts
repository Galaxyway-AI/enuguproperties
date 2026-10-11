import type { ListingPurpose } from "./domain";

export function searchPurpose(value?: string): ListingPurpose {
  return value === "rent" || value === "short-let" ? value : "sale";
}

export function searchBudget(purpose: ListingPurpose) {
  if (purpose === "rent")
    return {
      label: "Maximum annual rent",
      any: "Any annual rent",
      suffix: " / year",
      options: [
        500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000,
        20_000_000,
      ],
    };
  if (purpose === "short-let")
    return {
      label: "Maximum nightly rate",
      any: "Any nightly rate",
      suffix: " / night",
      options: [20_000, 30_000, 50_000, 75_000, 100_000, 200_000, 500_000],
    };
  return {
    label: "Maximum purchase price",
    any: "Any price",
    suffix: "",
    options: [
      5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000, 200_000_000,
      500_000_000,
    ],
  };
}
