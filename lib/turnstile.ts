export type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export function validTurnstileResult(
  result: TurnstileResult,
  expectedHostname: string | readonly string[],
  expectedAction: string,
) {
  const hostnames = Array.isArray(expectedHostname)
    ? expectedHostname
    : [expectedHostname];
  return (
    result.success === true &&
    typeof result.hostname === "string" &&
    hostnames.includes(result.hostname) &&
    result.action === expectedAction
  );
}
