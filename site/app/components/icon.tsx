import { type SVGProps } from "react";
import { type IconName } from "./icons/name";
import href from "./icons/sprite.svg";
import { cn } from "#utils/misc.js";

export { href };
export { IconName };

export function Icon({
  name,
  className,
  title,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  title?: string;
}) {
  return (
    <svg {...props} className={cn("inline self-center", className)}>
      {title ? <title>{title}</title> : null}
      <use href={`${href}#${name}`} />
    </svg>
  );
}
