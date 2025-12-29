const tldListUrl = new URL("../tld-list.json", import.meta.url);
const rawTlds = JSON.parse(
  await Deno.readTextFile(tldListUrl),
) as string[];

const tlds = rawTlds.map((tld) => tld.toLowerCase()).sort((a, b) => {
  return b.length - a.length || a.localeCompare(b);
});

export interface DomainHackSuggestion {
  domain: string;
  host: string;
  tld: string;
  left: string;
  available: boolean;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "");
}

async function findByTld(sanitized: string, tld: string) {
  if (!sanitized.endsWith(tld)) {
    return null;
  }

  const leftPart = sanitized.slice(0, sanitized.length - tld.length);
  if (!leftPart) {
    return null;
  }

  const dnsResponse = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(leftPart)}.${tld}&type=NS`,
    {
      headers: {
        accept: "application/dns-json",
      },
    },
  ).then((res) => res.json());

  const domain = `${leftPart}.${tld}`;
  return {
    domain,
    host: domain,
    tld,
    left: leftPart,
    available: (dnsResponse.Answer ?? []).length === 0,
  };
}

export async function findDomainHacks(query: string): Promise<DomainHackSuggestion[]> {
  const sanitized = normalizeQuery(query);
  if (!sanitized) {
    return [];
  }

  const matches = await Promise.all(tlds.map((tld) => findByTld(sanitized, tld)));

  return matches.filter((match) => match !== null);
}
