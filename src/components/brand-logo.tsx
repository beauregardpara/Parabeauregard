import Image from "next/image";

export function BrandLogo({
  compact = false,
  dark = false,
  className = "",
}: {
  compact?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${dark ? "rounded-xl bg-white p-1.5" : ""} ${className}`}>
      <Image
        src="/brand/para-beauregard-official.webp"
        alt="Parapharmacie Beauregard"
        width={compact ? 150 : 230}
        height={compact ? 40 : 62}
        className={compact ? "h-9 w-[150px] object-contain" : "h-auto w-[230px] max-w-full object-contain"}
      />
    </span>
  );
}
