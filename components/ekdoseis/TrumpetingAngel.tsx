import Image from "next/image";

export default function TrumpetingAngel({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/ekdoseis/angel-trumpet.png"
      alt=""
      width={745}
      height={470}
      className={`object-contain ${className}`}
      aria-hidden="true"
    />
  );
}
