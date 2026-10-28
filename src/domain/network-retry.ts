export async function retryThrottled<T extends { statusCode: number }>(
  operation: () => Promise<T>,
  pause: () => Promise<void>,
): Promise<T> {
  let result = await operation();
  for (let attempt = 0; result.statusCode === 429 && attempt < 2; attempt++) {
    await pause();
    result = await operation();
  }
  return result;
}
