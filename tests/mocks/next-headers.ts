export async function cookies() {
  const store = new Map<string, { value: string }>();
  return {
    get: (name: string) => store.get(name)?.value || undefined,
    set: (_name: string, value: unknown) => void value,
    delete: () => void 0,
  };
}
export async function headers() {
  return { get: () => null };
}