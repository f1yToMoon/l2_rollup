const NANO = 1_000_000_000;

export function formatTon(nanotons: number, decimals = 4): string {
  const tons = nanotons / NANO;
  return `${tons.toFixed(decimals)} TON`;
}

export function formatTonShort(nanotons: number): string {
  const tons = nanotons / NANO;
  if (tons >= 1000) return `${(tons / 1000).toFixed(2)}K TON`;
  if (tons >= 1) return `${tons.toFixed(2)} TON`;
  return `${(tons * 1000).toFixed(2)} mTON`;
}

export function tonToNano(tons: number): number {
  return Math.floor(tons * NANO);
}

export function nanoToTon(nanotons: number): number {
  return nanotons / NANO;
}

export function shortAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function formatRelative(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
