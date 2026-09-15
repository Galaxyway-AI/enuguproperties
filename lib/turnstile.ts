export type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export function validTurnstileResult(
  result: TurnstileResult,
  expectedHostname: string,
  expectedAction: string,
) {
  return (
    result.success === true &&
    result.hostname === expectedHostname &&
    result.action === expectedAction
  );
}
